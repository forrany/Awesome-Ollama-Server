/**
 * Ollama 工具函数库
 * 提供与 Ollama API 交互的通用函数
 */

// 超时设置
export const TIMEOUT_MS = 30000; // 30秒超时

// 测试提示词
export const TEST_PROMPTS = [
  "Tell me a short story about a robot who learns to love.",
  "Explain the concept of recursion in programming.",
  "What are the main differences between classical and quantum computing?"
];

// 定义模型信息的接口
export interface ModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// 创建带超时的 fetch 函数
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 获取 ollama 的版本。
export async function getVersion(url: string): Promise<ModelInfo[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/version`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`服务返回非 200 状态码: ${url}, 状态码: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.version || "";
  } catch (error) {
    console.error('获取版本失败:', error);
    return null;
  }
}

// 检查服务可用性并获取模型列表
export async function checkService(url: string): Promise<ModelInfo[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`服务返回非 200 状态码: ${url}, 状态码: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('检查服务失败:', error);
    return null;
  }
}

// 检测 TPS 是否在合理范围内
export function isValidTPS(tps: number): boolean {
  // 正常的 Ollama 服务 TPS 通常在 0.1 到 100 之间
  // 高性能服务器可能达到 200-300 TPS
  // 超过 1000 的 TPS 值通常是不合理的
  const MIN_VALID_TPS = 0.01;  // 最小有效 TPS
  const MAX_VALID_TPS = 1000;  // 最大有效 TPS
  
  return tps >= MIN_VALID_TPS && tps <= MAX_VALID_TPS;
}

// 检测是否为 fake-ollama
export function isFakeOllama(response: string): boolean {
  return response.includes('fake-ollama') || 
         response.includes('这是一条来自') || 
         response.includes('固定回复');
}

// 估算文本的 token 数量
export function estimateTokens(text: string): number {
  // 这是一个简单的估算，实际的 token 数量可能会有所不同
  // 1. 按空格分词
  const words = text.split(/\s+/);
  // 2. 考虑标点符号
  const punctuation = text.match(/[.,!?;:'"()\[\]{}]/g)?.length || 0;
  // 3. 考虑数字
  const numbers = text.match(/\d+/g)?.length || 0;
  
  return words.length + punctuation + numbers;
}

// 生成测试请求体
export function generateRequestBody(model: string, prompt: string, stream = false) {
  return {
    model,
    prompt,
    stream,
    options: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
    }
  };
}

// 计算 TPS (Tokens Per Second)
export function calculateTPS(data: { eval_count: number, eval_duration: number }): number {
  // 使用 API 返回的 eval_count 和 eval_duration 计算 TPS
  if (data.eval_count && data.eval_duration) {
    // eval_duration 是纳秒单位，计算: eval_count / eval_duration * 10^9
    const tps = (data.eval_count / data.eval_duration) * 1e9;
    
    // 检查 TPS 是否在合理范围内
    if (!isValidTPS(tps)) {
      console.warn(`检测到异常 TPS 值: ${tps.toFixed(2)}`);
      // 如果 TPS 不合理，返回一个合理的默认值
      return 0;
    }
    
    return tps;
  }
  
  // 如果没有这些字段，返回 0
  return 0;
} 
