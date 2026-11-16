#!/usr/bin/env node
/**
 * 通过 stdio 连接本仓库 MCP server，验证 tools/list 与部分 tools/call。
 * 用法：npm run smoke
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = path.join(root, "build", "index.js");

const expectedTools = [
  "get-city-weather",
  "get-location-weather",
  "get-air-quality",
  "get-weather-alerts",
];

function textFromResult(result) {
  return (result.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    cwd: root,
    stderr: "inherit",
  });

  const client = new Client({ name: "weather-smoke", version: "1.0.0" });
  await client.connect(transport);

  try {
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    console.log("tools/list:", names.join(", "));

    for (const name of expectedTools) {
      if (!names.includes(name)) {
        throw new Error(`缺少工具: ${name}`);
      }
    }

    const cityWeather = await client.callTool({
      name: "get-city-weather",
      arguments: { city: "北京" },
    });
    const cityText = textFromResult(cityWeather);
    if (!cityText.includes("北京") || cityText.includes("无法获取")) {
      throw new Error(`get-city-weather 结果异常:\n${cityText.slice(0, 500)}`);
    }
    console.log("get-city-weather: OK");

    const locationWeather = await client.callTool({
      name: "get-location-weather",
      arguments: { latitude: 31.2304, longitude: 121.4737 },
    });
    const locationText = textFromResult(locationWeather);
    if (!locationText.includes("当前位置") || locationText.includes("无法获取")) {
      throw new Error(`get-location-weather 结果异常:\n${locationText.slice(0, 500)}`);
    }
    console.log("get-location-weather: OK");

    const airQuality = await client.callTool({
      name: "get-air-quality",
      arguments: { city: "上海" },
    });
    const airText = textFromResult(airQuality);
    if (!airText.includes("空气质量") || airText.includes("无法获取")) {
      throw new Error(`get-air-quality 结果异常:\n${airText.slice(0, 500)}`);
    }
    console.log("get-air-quality: OK");

    const alerts = await client.callTool({
      name: "get-weather-alerts",
      arguments: { city: "广州" },
    });
    const alertText = textFromResult(alerts);
    if (!alertText.includes("暂不支持")) {
      throw new Error(`get-weather-alerts 结果异常:\n${alertText.slice(0, 500)}`);
    }
    console.log("get-weather-alerts: OK");

    console.log("smoke 验证全部通过");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("smoke 验证失败:", error);
  process.exit(1);
});
