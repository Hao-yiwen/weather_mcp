# weather_mcp

基于 [Open-Meteo](https://open-meteo.com/) 的中国天气 MCP（Model Context Protocol）服务器，使用 **stdio** 传输，无需 API 密钥。

## 环境要求

- **Node.js**：`>= 18`（推荐使用当前 LTS，例如 20/22）
- **包管理器**：npm（仓库含 `package-lock.json`）
- 网络可访问：
  - `https://api.open-meteo.com`（天气预报）
  - `https://air-quality-api.open-meteo.com`（空气质量）

## 安装与构建

```bash
npm ci
npm run typecheck
npm run build
```

构建产物位于 `build/index.js`。

常用脚本：

| 命令 | 说明 |
| --- | --- |
| `npm run build` | TypeScript 编译并设置可执行权限 |
| `npm run typecheck` | 仅类型检查，不输出产物 |
| `npm start` | 以 stdio 方式启动 MCP 服务器 |
| `npm run smoke` | 构建后通过 MCP Client 验证 `tools/list` 与工具调用 |

## 本地启动

```bash
npm start
```

服务器通过标准输入/输出与 MCP 客户端通信；不要用浏览器直接打开。

### 使用 MCP Inspector（可选）

安装依赖并构建后：

```bash
npx @modelcontextprotocol/inspector node ./build/index.js
```

在 Inspector 中可查看工具列表并手动调用。

## 提供的工具

工具名称与行为保持不变：

| 工具名 | 说明 |
| --- | --- |
| `get-city-weather` | 按内置中国城市名查询当前天气与未来 7 天预报 |
| `get-location-weather` | 按经纬度查询天气预报 |
| `get-air-quality` | 按城市查询空气质量（US AQI 及主要污染物） |
| `get-weather-alerts` | 天气预警占位接口（目前返回“暂不支持实时预警”提示） |

内置城市示例：北京、上海、广州、深圳、成都、杭州等。

## 在 MCP 客户端中配置

将下面的 `command` / `args` 中的路径换成你本机克隆后的绝对路径。

### Cursor / Claude Desktop 等（stdio）

```json
{
  "mcpServers": {
    "china-weather": {
      "command": "node",
      "args": ["/绝对路径/weather_mcp/build/index.js"]
    }
  }
}
```

或使用 npm bin（需先 `npm run build`，且 PATH 中能找到该包的 bin）：

```json
{
  "mcpServers": {
    "china-weather": {
      "command": "node",
      "args": ["./build/index.js"],
      "cwd": "/绝对路径/weather_mcp"
    }
  }
}
```

> 说明：本仓库当前实现为 **stdio** 传输。若客户端仅支持 Streamable HTTP，需要另行增加 HTTP 传输层；本维护更新未改传输方式，以保持原有用法。

## 数据来源与限制

- 天气预报：Open-Meteo Forecast API（无需密钥）
- 空气质量：Open-Meteo Air Quality API（独立域名，无需密钥）
- `get-weather-alerts` 无真实预警数据源，仅返回说明文案

## 许可证

ISC
