import { Redis } from '@upstash/redis'
import { promises as fs } from 'fs'
import { join } from 'path'
import { OllamaService } from '../src/types'
import { fofaScan } from './fofa-scan.mjs'
import {
  ModelInfo,
  fetchWithTimeout,
  checkService as checkServiceUtil,
  getVersion,
  isFakeOllama,
  generateRequestBody,
  calculateTPS,
  isValidTPS
} from '../src/lib/ollama-utils'

const TEST_PROMPT = "Tell me a short joke"
const CONCURRENT_LIMIT = 50 // 并发数限制
const RESULT_FILE = join(process.cwd(), 'public', 'data.json')
const COUNTRYS = process.env.COUNTRYS ? process.env.COUNTRYS.split(',') : ['US', 'CN', 'RU']

// Redis 客户端配置
const redis = process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN,
    })
  : null;

// 检查服务是否可用 - 使用共享库
const checkService = checkServiceUtil;

// 测量TPS
async function measureTPS(url: string, model: ModelInfo): Promise<number | { isFake: true }> {
  try {
    const response = await fetchWithTimeout(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(generateRequestBody(model.name, TEST_PROMPT, false)),
    });

    if (!response.ok) {
      console.log(`性能测试返回非 200 状态码: ${url}, 状态码: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    
    // 检查是否为 fake-ollama
    if (data.response && isFakeOllama(data.response)) {
      console.log(`检测到 fake-ollama: ${url}`);
      return { isFake: true };
    }
    
    // 使用 API 返回的 eval_count 和 eval_duration 计算 TPS
    if (data.eval_count && data.eval_duration) {
      const rawTps = (data.eval_count / data.eval_duration) * 1e9;
      
      // 检查 TPS 是否异常
      if (!isValidTPS(rawTps)) {
        console.warn(`检测到异常 TPS 值: ${rawTps.toFixed(2)} 来自服务器: ${url}`);
        return { isFake: true };
      }
      
      return calculateTPS(data);
    }
    
    // 如果 API 没有返回这些字段，则使用旧方法计算
    const endTime = Date.now();
    const startTime = new Date(data.created_at).getTime();
    const timeInSeconds = (endTime - startTime) / 1000;
    const tps = timeInSeconds > 0 ? 1 / timeInSeconds : 0;
    
    // 检查计算出的 TPS 是否合理
    if (!isValidTPS(tps)) {
      console.warn(`计算出的 TPS 异常: ${tps.toFixed(2)} 来自服务器: ${url}`);
      return { isFake: true };
    }
    
    return tps;
  } catch (error) {
    console.error(`性能测试出错 ${url}:`, error);
    return 0;
  }
}

// 保存单个结果到文件, 已废弃
async function saveResult(service: OllamaService): Promise<void> {
  try {
    let results: OllamaService[] = []
    try {
      const data = await fs.readFile(RESULT_FILE, 'utf-8')
      results = JSON.parse(data)
    } catch (error) {
      // 文件不存在或解析错误，使用空数组
      results = []
      console.error(`读取结果文件失败:`, error)
    }

    // 更新或添加结果
    const index = results.findIndex(r => r.server === service.server)
    if (index !== -1) {
      results[index] = service
    } else {
      results.push(service)
    }

    await fs.writeFile(RESULT_FILE, JSON.stringify(results, null, 2))
    console.log(`已保存服务结果: ${service.server}`)
  } catch (error) {
    console.error(`保存结果失败 ${service.server}:`, error)
  }
}

// 检查单个服务
async function checkSingleService(url: string): Promise<OllamaService | null> {
  console.log(`\n正在检查服务: ${url}`);
  
  try {
    const models = await checkService(url);
    const version = await getVersion(url);
    const result: OllamaService = {
      server: url,
      models: [],
      version: '',
      tps: 0,
      lastUpdate: new Date().toISOString(),
      status: 'loading'
    };
    
    if (version) {
      result.version = version;
    }

    if (models && models.length > 0) {
      try {
        const tpsResult = await measureTPS(url, models[0]);
        
        // 检查是否为 fake-ollama
        if (typeof tpsResult === 'object' && 'isFake' in tpsResult) {
          result.status = 'fake';
          result.isFake = true;
          result.tps = 0;
          console.log(`服务 ${url} 是伪装的 Ollama 服务，已标记`);
          return null; // 返回 null 表示不保存这个服务
        } else {
          result.models = models.map(model => model.name);
          result.tps = tpsResult as number;
          result.status = 'success';
        }
      } catch (error) {
        console.error(`测量 TPS 失败 ${url}:`, error);
        result.status = 'error';
      }
    } else {
      result.status = 'error';
    }
    
    return result;
  } catch (error) {
    console.error(`检查服务失败 ${url}:`, error);
    return {
      server: url,
      models: [],
      tps: 0,
      lastUpdate: new Date().toISOString(),
      status: 'error'
    };
  }
}

// 并发执行检查任务
async function runBatch(urls: string[]): Promise<OllamaService[]> {
  const results: OllamaService[] = [];
  const promises = urls.map(async url => {
    try {
      const service = await checkSingleService(url);
      if (service && service.models && service.models.length > 0) {
        results.push(service);
      }
    } catch (error) {
      console.error(`处理服务失败 ${url}:`, error);
    }
  });
  
  await Promise.allSettled(promises);
  return results;
}

// 主函数
export async function main() {
  if (!redis) {
    console.error('Redis 配置未设置，无法执行监控任务');
    return;
  }

  try {
    console.log('开始更新服务...');

    // 1. 从 Redis 的 Set 中读取服务器列表
    const encodedUrls = await redis.smembers('ollama:servers');
    const urls = encodedUrls.map(url => decodeURIComponent(url));

    console.log(`从 Redis 读取到 ${urls.length} 个服务器`);

    // 2. 从 Fofa 获取服务器列表
    const fofaUrls: string[] = [];
    const fofaPromises = COUNTRYS.map(country => fofaScan(country));
    const fofaResults = await Promise.all(fofaPromises);
    
    fofaResults.forEach(result => {
      fofaUrls.push(...result.hosts);
    });

    console.log(`从 Fofa 读取到 ${fofaUrls.length} 个服务器`);

    // 3. 合并服务器列表
    const allUrls = [...urls, ...fofaUrls];

    // 4. 清空结果文件
    await fs.writeFile(RESULT_FILE, '[]');

    // 有效服务器列表
    const validServers = new Set<string>();

    // 3. 分批处理服务器
    for (let i = 0; i < allUrls.length; i += CONCURRENT_LIMIT) {
      const batch = allUrls.slice(i, i + CONCURRENT_LIMIT);
      console.log(`\n处理批次 ${Math.floor(i / CONCURRENT_LIMIT) + 1}/${Math.ceil(allUrls.length / CONCURRENT_LIMIT)} (${batch.length} 个服务)`);
      
      const results = await runBatch(batch);
      
      // 记录有效的服务器
      results.forEach(result => {
        if (result.models && result.models.length > 0 && result.status === 'success') {
          validServers.add(encodeURIComponent(result.server));
        }
      });

      // 保存当前批次的结果
      try {
        let existingResults: OllamaService[] = [];
        try {
          const data = await fs.readFile(RESULT_FILE, 'utf-8');
          existingResults = JSON.parse(data);
        } catch (error) {
          console.error('读取结果文件失败，使用空数组', error);
        }

        const newResults = [...existingResults, ...results];
        await fs.writeFile(RESULT_FILE, JSON.stringify(newResults, null, 2));
      } catch (error) {
        console.error('保存结果失败:', error);
      }
    }

    // 4. 更新 Redis 中的有效服务器列表
    if (validServers.size > 0) {
      console.log(`\n更新 Redis 中的有效服务器列表`);
      try {
        // 将 Set 转换为数组，并去重处理
        const serversArray = Array.from(validServers) as [string, ...string[]];
        
        // 先清空后批量添加（完全替换）
        await redis
          .pipeline()
          .del('ollama:servers')
          .sadd('ollama:servers', ...serversArray)
          .exec();
    
        console.log(`成功更新 ${serversArray.length} 个服务器`);
      } catch (err) {
        console.error('更新 Redis 失败:', err);
        // 这里可以添加重试逻辑
      }
    }

    console.log(`\n更新完成，共有 ${validServers.size} 个有效服务器`);

  } catch (error) {
    console.error('更新服务失败:', error);
  }
}

// 导出需要的函数
export { checkService, measureTPS, saveResult }

// 如果直接运行此文件则执行主函数
if (require.main === module) {
  main()
}
