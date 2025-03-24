import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const OPEN_METEO_API_BASE = "https://api.open-meteo.com/v1";

// 创建服务器实例
const server = new McpServer({
  name: "china-weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 城市坐标映射表（部分中国主要城市）
const CHINA_CITIES: any = {
  "北京": { latitude: 39.9042, longitude: 116.4074 },
  "上海": { latitude: 31.2304, longitude: 121.4737 },
  "广州": { latitude: 23.1291, longitude: 113.2644 },
  "深圳": { latitude: 22.5431, longitude: 114.0579 },
  "成都": { latitude: 30.5728, longitude: 104.0668 },
  "杭州": { latitude: 30.2741, longitude: 120.1551 },
  "武汉": { latitude: 30.5928, longitude: 114.3055 },
  "西安": { latitude: 34.3416, longitude: 108.9398 },
  "南京": { latitude: 32.0617, longitude: 118.7778 },
  "重庆": { latitude: 29.4316, longitude: 106.9123 },
  "天津": { latitude: 39.3434, longitude: 117.3616 },
  "苏州": { latitude: 31.2989, longitude: 120.5853 },
  "哈尔滨": { latitude: 45.8038, longitude: 126.5350 },
  "长春": { latitude: 43.8171, longitude: 125.3235 },
  "沈阳": { latitude: 41.8057, longitude: 123.4315 },
  "长沙": { latitude: 28.2282, longitude: 112.9388 },
  "济南": { latitude: 36.6512, longitude: 117.1201 },
  "青岛": { latitude: 36.0671, longitude: 120.3826 },
  "大连": { latitude: 38.9140, longitude: 121.6147 },
  "厦门": { latitude: 24.4798, longitude: 118.0894 }
};

// 天气代码映射表（Open-Meteo的WMO天气代码）
const WEATHER_CODES: any = {
  0: "晴天",
  1: "大部分晴天",
  2: "部分多云",
  3: "阴天",
  45: "雾",
  48: "沉积雾",
  51: "小毛毛雨",
  53: "中毛毛雨",
  55: "大毛毛雨",
  56: "小冻雨",
  57: "大冻雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "小冻雨",
  67: "大冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "小阵雨",
  81: "中阵雨",
  82: "大阵雨",
  85: "小阵雪",
  86: "大阵雪",
  95: "雷暴",
  96: "雷暴伴有小冰雹",
  99: "雷暴伴有大冰雹"
};

// 辅助函数，用于从Open-Meteo API请求数据
async function fetchOpenMeteoData(url: string): Promise<any | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("请求Open-Meteo API时出错:", error);
    return null;
  }
}

// 将温度和天气代码格式化为易读的中文
function formatWeatherDescription(temp: number, weatherCode: number): string {
  const weatherDesc = WEATHER_CODES[weatherCode] || "未知天气";
  return `${temp}°C，${weatherDesc}`;
}

// 中国城市天气预报
server.tool(
  "get-city-weather",
  "获取中国城市的天气预报",
  {
    city: z.string().describe("中国城市名称（如北京、上海等）"),
  },
  async ({ city }) => {
    // 检查城市是否在我们的列表中
    const cityInfo = CHINA_CITIES[city];
    if (!cityInfo) {
      return {
        content: [
          {
            type: "text",
            text: `抱歉，目前不支持 ${city} 的天气查询。支持的城市包括：${Object.keys(CHINA_CITIES).join("、")}`,
          },
        ],
      };
    }

    const { latitude, longitude } = cityInfo;
    
    // 构建Open-Meteo API的URL
    const forecastUrl = `${OPEN_METEO_API_BASE}/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Asia/Shanghai&current_weather=true&forecast_days=7`;
    
    // 获取天气预报数据
    const weatherData = await fetchOpenMeteoData(forecastUrl);
    
    if (!weatherData) {
      return {
        content: [
          {
            type: "text",
            text: `无法获取 ${city} 的天气数据。请稍后再试。`,
          },
        ],
      };
    }

    // 提取当前天气和未来预报
    const currentWeather = weatherData.current_weather;
    const dailyData = weatherData.daily;
    
    // 转换时间格式（如"2025-03-25T12:00" -> "3月25日12:00"）
    const formatDatetime = (dateTimeStr: string): string => {
      const date = new Date(dateTimeStr);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:00`;
    };

    // 格式化风向
    const formatWindDirection = (degrees: number): string => {
      const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
      const index = Math.round((degrees % 360) / 45) % 8;
      return directions[index];
    };

    // 格式化日期（如"2025-03-25" -> "3月25日"）
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    };

    // 构建当前天气文本
    const currentTime = formatDatetime(currentWeather.time);
    const currentTemp = currentWeather.temperature;
    const currentWeatherDesc = WEATHER_CODES[currentWeather.weathercode] || "未知天气";
    const windSpeed = currentWeather.windspeed;
    const windDirection = formatWindDirection(currentWeather.winddirection);
    
    const currentWeatherText = `${city}当前天气（${currentTime}）：\n温度：${currentTemp}°C\n天气：${currentWeatherDesc}\n风力：${windSpeed}km/h ${windDirection}风`;
    
    // 构建未来天气预报文本
    let forecastText = `\n\n未来7天天气预报：`;
    for (let i = 0; i < dailyData.time.length; i++) {
      const date = formatDate(dailyData.time[i]);
      const maxTemp = dailyData.temperature_2m_max[i];
      const minTemp = dailyData.temperature_2m_min[i];
      const weatherCode = dailyData.weathercode[i];
      const weatherDesc = WEATHER_CODES[weatherCode] || "未知天气";
      const sunrise = new Date(dailyData.sunrise[i]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const sunset = new Date(dailyData.sunset[i]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      
      forecastText += `\n\n${date}：\n天气：${weatherDesc}\n温度：${minTemp}°C - ${maxTemp}°C\n日出：${sunrise}\n日落：${sunset}`;
    }
    
    const fullWeatherText = currentWeatherText + forecastText;
    
    return {
      content: [
        {
          type: "text",
          text: fullWeatherText,
        },
      ],
    };
  },
);

// 按经纬度获取天气
server.tool(
  "get-location-weather",
  "根据经纬度获取天气预报",
  {
    latitude: z.number().min(-90).max(90).describe("地点的纬度"),
    longitude: z.number().min(-180).max(180).describe("地点的经度"),
  },
  async ({ latitude, longitude }) => {
    // 构建Open-Meteo API的URL
    const forecastUrl = `${OPEN_METEO_API_BASE}/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Asia/Shanghai&current_weather=true&forecast_days=7`;
    
    // 获取天气预报数据
    const weatherData = await fetchOpenMeteoData(forecastUrl);
    
    if (!weatherData) {
      return {
        content: [
          {
            type: "text",
            text: `无法获取该位置(${latitude}, ${longitude})的天气数据。请稍后再试。`,
          },
        ],
      };
    }

    // 提取当前天气和未来预报
    const currentWeather = weatherData.current_weather;
    const dailyData = weatherData.daily;
    
    // 转换时间格式（如"2025-03-25T12:00" -> "3月25日12:00"）
    const formatDatetime = (dateTimeStr: string): string => {
      const date = new Date(dateTimeStr);
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:00`;
    };

    // 格式化风向
    const formatWindDirection = (degrees: number): string => {
      const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
      const index = Math.round((degrees % 360) / 45) % 8;
      return directions[index];
    };

    // 格式化日期（如"2025-03-25" -> "3月25日"）
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    };

    // 构建当前天气文本
    const currentTime = formatDatetime(currentWeather.time);
    const currentTemp = currentWeather.temperature;
    const currentWeatherDesc = WEATHER_CODES[currentWeather.weathercode] || "未知天气";
    const windSpeed = currentWeather.windspeed;
    const windDirection = formatWindDirection(currentWeather.winddirection);
    
    const currentWeatherText = `当前位置(${latitude.toFixed(2)}, ${longitude.toFixed(2)})天气（${currentTime}）：\n温度：${currentTemp}°C\n天气：${currentWeatherDesc}\n风力：${windSpeed}km/h ${windDirection}风`;
    
    // 构建未来天气预报文本
    let forecastText = `\n\n未来7天天气预报：`;
    for (let i = 0; i < dailyData.time.length; i++) {
      const date = formatDate(dailyData.time[i]);
      const maxTemp = dailyData.temperature_2m_max[i];
      const minTemp = dailyData.temperature_2m_min[i];
      const weatherCode = dailyData.weathercode[i];
      const weatherDesc = WEATHER_CODES[weatherCode] || "未知天气";
      const sunrise = new Date(dailyData.sunrise[i]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const sunset = new Date(dailyData.sunset[i]).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      
      forecastText += `\n\n${date}：\n天气：${weatherDesc}\n温度：${minTemp}°C - ${maxTemp}°C\n日出：${sunrise}\n日落：${sunset}`;
    }
    
    const fullWeatherText = currentWeatherText + forecastText;
    
    return {
      content: [
        {
          type: "text",
          text: fullWeatherText,
        },
      ],
    };
  },
);

// 获取空气质量
server.tool(
  "get-air-quality",
  "获取城市的空气质量指数",
  {
    city: z.string().describe("中国城市名称（如北京、上海等）"),
  },
  async ({ city }) => {
    // 检查城市是否在我们的列表中
    const cityInfo = CHINA_CITIES[city];
    if (!cityInfo) {
      return {
        content: [
          {
            type: "text",
            text: `抱歉，目前不支持 ${city} 的空气质量查询。支持的城市包括：${Object.keys(CHINA_CITIES).join("、")}`,
          },
        ],
      };
    }

    const { latitude, longitude } = cityInfo;
    
    // 构建Open-Meteo Air Quality API的URL
    const airQualityUrl = `${OPEN_METEO_API_BASE}/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi&timezone=Asia/Shanghai`;
    
    // 获取空气质量数据
    const airQualityData = await fetchOpenMeteoData(airQualityUrl);
    
    if (!airQualityData || !airQualityData.hourly) {
      return {
        content: [
          {
            type: "text",
            text: `无法获取 ${city} 的空气质量数据。请稍后再试。`,
          },
        ],
      };
    }

    // 获取最新空气质量数据（当前小时）
    const hourly = airQualityData.hourly;
    const currentIndex = 0; // 当前小时的索引
    
    // 获取各项指标的当前值
    const pm10 = hourly.pm10[currentIndex];
    const pm25 = hourly.pm2_5[currentIndex];
    const co = hourly.carbon_monoxide[currentIndex];
    const no2 = hourly.nitrogen_dioxide[currentIndex];
    const so2 = hourly.sulphur_dioxide[currentIndex];
    const o3 = hourly.ozone[currentIndex];
    const europeanAqi = hourly.european_aqi[currentIndex];
    const usAqi = hourly.us_aqi[currentIndex];
    
    // AQI级别解释
    const getAqiLevel = (aqi: number): string => {
      if (aqi <= 50) return "优";
      if (aqi <= 100) return "良";
      if (aqi <= 150) return "轻度污染";
      if (aqi <= 200) return "中度污染";
      if (aqi <= 300) return "重度污染";
      return "严重污染";
    };
    
    // 构建空气质量报告
    const aqiLevel = getAqiLevel(usAqi);
    const currentTime = new Date(hourly.time[currentIndex]).toLocaleString('zh-CN');
    
    const airQualityText = `${city}空气质量报告（${currentTime}）：

空气质量指数(AQI)：${usAqi} - ${aqiLevel}

详细指标：
- PM10：${pm10.toFixed(1)} μg/m³
- PM2.5：${pm25.toFixed(1)} μg/m³
- 一氧化碳(CO)：${co.toFixed(1)} μg/m³
- 二氧化氮(NO₂)：${no2.toFixed(1)} μg/m³
- 二氧化硫(SO₂)：${so2.toFixed(1)} μg/m³
- 臭氧(O₃)：${o3.toFixed(1)} μg/m³

数据来源：Open-Meteo API`;
    
    return {
      content: [
        {
          type: "text",
          text: airQualityText,
        },
      ],
    };
  },
);

// 获取天气预警
server.tool(
  "get-weather-alerts",
  "获取城市的天气预警信息",
  {
    city: z.string().describe("中国城市名称（如北京、上海等）"),
  },
  async ({ city }) => {
    // 天气预警信息
    // 注意：Open-Meteo API目前没有直接提供中国的天气预警信息
    // 这里我们提供一个模拟的接口，实际应用中需要对接中国气象局或其他提供预警服务的API
    
    // 检查城市是否在我们的列表中
    const cityInfo = CHINA_CITIES[city];
    if (!cityInfo) {
      return {
        content: [
          {
            type: "text",
            text: `抱歉，目前不支持 ${city} 的天气预警查询。支持的城市包括：${Object.keys(CHINA_CITIES).join("、")}`,
          },
        ],
      };
    }
    
    // 由于我们没有实际的预警API，返回一个提示信息
    return {
      content: [
        {
          type: "text",
          text: `目前暂不支持实时天气预警信息获取。如需天气预警信息，建议访问中国气象局官方网站或使用其他气象服务提供商的API。`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("中国天气MCP服务器正在运行于stdio");
}

main().catch((error) => {
  console.error("main()发生致命错误:", error);
  process.exit(1);
})