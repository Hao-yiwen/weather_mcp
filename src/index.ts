import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const CRN_MCP_API_ENDPOINT = "http://llms-chat.ctripcorp.com/crnMcp";

// 创建服务器实例
const server = new McpServer({
  name: "crn-content-assistant",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// 辅助函数，用于从CRN MCP API请求数据
async function fetchCrnData(message) {
  try {
    const response = await fetch(CRN_MCP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("请求CRN MCP API时出错:", error);
    return null;
  }
}

// CRN内容查询工具
server.tool(
  "query-crn-content",
  "查询CRN相关资料",
  {
    message: z.string().describe("用户的查询消息"),
  },
  async ({ message }) => {
    // 获取CRN相关上下文
    const crnData = await fetchCrnData(message);
    
    if (!crnData) {
      return {
        content: [
          {
            type: "text",
            text: "无法获取CRN相关资料。请稍后再试。",
          },
        ],
      };
    }
    
    // 处理响应格式 {success:true,message:"非常多的上下文"}
    let responseText = "CRN资料查询结果：\n\n";
    
    if (crnData.success === true && crnData.message) {
      // 成功获取到上下文，直接使用message字段的内容
      responseText += crnData.message;
    } else if (crnData.success === false) {
      // 查询失败
      responseText = `查询失败: ${crnData.message || "未知错误"}`;
    } else {
      // 其他未预期的响应格式，尝试提取有用信息
      if (typeof crnData === 'string') {
        responseText += crnData;
      } else if (crnData.content) {
        responseText += crnData.content;
      } else {
        responseText += JSON.stringify(crnData, null, 2);
      }
    }
    
    return {
      content: [
        {
          type: "text",
          text: responseText,
        },
      ],
    };
  },
);


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CRN内容查询助手MCP服务器正在运行于stdio");
}

main().catch((error) => {
  console.error("main()发生致命错误:", error);
  process.exit(1);
});