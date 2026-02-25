import { 
  Zap, ArrowRightLeft, Database, Calculator, MessageSquare, Mail, 
  FileSpreadsheet, Search, Globe, Rss, Fingerprint, 
  Variable, FileJson, Calendar, Flame, Send, GitMerge, GitFork, Clock, Wallet, Sparkles, TrendingUp, FileText, Save
} from 'lucide-react';

export const CATEGORY_COLORS: Record<string, any> = {
  trigger: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', accent: 'bg-amber-500' },
  web3:   { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', accent: 'bg-indigo-500' },
  data:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', accent: 'bg-emerald-500' },
  logic:  { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', accent: 'bg-slate-500' },
  notify: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', accent: 'bg-rose-500' },
  ops: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', accent: 'bg-blue-500' },
  ai: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-600', accent: 'bg-fuchsia-500' },
};

export const NODE_TYPES: Record<string, any> = {
  
  // --- TRIGGERS ---
  'webhook': { 
    label: 'Webhook Trigger', category: 'trigger', icon: Zap,
    inputs: [
      { 
        name: '_info', 
        label: 'How to use', 
        type: 'textarea', 
        readOnly: true,
        placeholder: "1. Name your workflow in Settings.\n2. Click Deploy.\n3. Send POST requests to:\nhttp://localhost:3001/webhook/workflow_[your_workflow_name]\n\nAccess payload variables using: {{WebhookBody.your_field}}"
      } 
    ] 
  },
  'sheets': {
    label: 'G-Sheet Watcher', category: 'trigger', icon: FileSpreadsheet, 
    inputs: [
      { name: 'colIndex', label: 'Column Index (0=A)', type: 'number', placeholder: '4' },
      { name: 'value', label: 'Trigger Value', type: 'text', placeholder: 'Pending' }
    ]
    // Note: Sheet variables are handled dynamically via Global Settings Mapping
  },
  'timer': {
    label: 'Schedule / Cron', category: 'trigger', icon: Clock,
    inputs: [
      { name: 'scheduleType', label: 'Schedule Type', type: 'select', options: ['interval', 'cron'] },
      { name: 'intervalMinutes', label: 'Every X Minutes', type: 'number', placeholder: '60', required: false },
      { name: 'cronExpression', label: 'Cron Expression', type: 'text', placeholder: '0 12 * * *', required: false }
    ]
  },

  // --- WEB3 ---
  'transfer': { 
    label: 'Transfer Token', category: 'web3', icon: Send,
    inputs: [
      { name: 'toAddress', label: 'To Address', type: 'text', placeholder: '0x... or {{Wallet}}' },
      { name: 'amount', label: 'Amount', type: 'text', placeholder: '1.5' },
      { name: 'currency', label: 'Token Symbol', type: 'select', options: ['USDC', 'ETH'] },
    ],
    outputs: [{ name: 'TX_HASH', desc: 'Transaction Hash' }]
  },
  'swap_uniswap': { 
    label: 'Uniswap Swap', category: 'web3', icon: ArrowRightLeft,
    inputs: [
      { name: 'tokenIn', label: 'Token In', type: 'select', options: ['ETH', 'USDC', 'WETH', 'UNI', 'LINK', 'Custom'] },
      { name: 'tokenOut', label: 'Token Out', type: 'select', options: ['USDC', 'ETH', 'WETH', 'UNI', 'LINK', 'Custom'] },
      { name: 'amountIn', label: 'Amount', type: 'text', placeholder: '100 or {{node_1.BALANCE}}' },
      { name: 'recipient', label: 'Recipient Address', type: 'text', placeholder: '0x...' },
      { name: 'customTokenIn', label: 'Custom Token In (Opt)', type: 'text', placeholder: '0x...', required: false },
      { name: 'customTokenOut', label: 'Custom Token Out (Opt)', type: 'text', placeholder: '0x...', required: false },
      { name: 'customDecimals', label: 'Custom Decimals (Opt)', type: 'number', placeholder: '18', required: false },
      { name: 'customIsNative', label: 'Is Custom Native?', type: 'select', options: ['false', 'true'], required: false },
    ],
    outputs: [{ name: 'TX_HASH', desc: 'Swap Transaction Hash' }]
  },

  // Issues with Aave v3 protocols:
  // 'aave_supply': { 
  //   label: 'Aave Supply', category: 'web3', icon: Layers,
  //   inputs: [
  //     { name: 'asset', label: 'Asset Address', type: 'text', placeholder: '0x...' },
  //     { name: 'amount', label: 'Amount', type: 'text' },
  //     { name: 'onBehalfOf', label: 'On Behalf Of', type: 'text', placeholder: '0x...' },
  //     { name: 'decimals', label: 'Decimals (Opt)', type: 'number', placeholder: '18', required: false },
  //   ],
  //   outputs: [{ name: 'TX_HASH', desc: 'Supply Transaction Hash' }]
  // },
  'read_contract': { 
    label: 'Read Contract', category: 'web3', icon: Search,
    inputs: [
      { name: 'contractAddress', label: 'Contract', type: 'text' },
      { name: 'functionSignature', label: 'Function Sig', type: 'text', placeholder: 'function balanceOf(address) view returns (uint256)' },
      { name: 'args', label: 'Args (Comma Sep)', type: 'text', placeholder: '0x123', required: false },
    ],
    outputs: [{ name: 'CONTRACT_RESULT', desc: 'Value read from blockchain' }]
  },
  'write_contract': { 
    label: 'Write Contract', category: 'web3', icon: Fingerprint,
    inputs: [
      { name: 'contractAddress', label: 'Contract', type: 'text' },
      { name: 'functionSignature', label: 'Function Sig', type: 'text', placeholder: 'approve(address,uint256)' },
      { name: 'args', label: 'Args (Comma Sep)', type: 'text', required: false },
      { name: 'value', label: 'ETH Value (Wei)', type: 'text', placeholder: '0', required: false },
    ],
    outputs: [{ name: 'TX_HASH', desc: 'Transaction Hash' }]
  },
  'resolve_ens': { 
    label: 'Resolve ENS', category: 'web3', icon: Search,
    inputs: [{ name: 'domain', label: 'ENS Domain', type: 'text', placeholder: 'vitalik.eth' }],
    outputs: [{ name: 'ENS_ADDRESS', desc: 'Resolved Wallet Address' }]
  },
  'get_gas_price': { 
    label: 'Get Gas Price', category: 'data', icon: Flame,
    inputs: [],
    outputs: [{ name: 'GAS_PRICE', desc: 'Current Gas (Gwei)' }] 
  },

  // --- DATA ---
  'get_price': { 
    label: 'Get Token Price', category: 'data', icon: Database,
    inputs: [{ name: 'tokenId', label: 'Coingecko ID', type: 'text', placeholder: 'ethereum' }],
    outputs: [{ name: 'PRICE', desc: 'Token Price (USD)' }]
  },
  'http_request': { 
    label: 'HTTP Request', category: 'data', icon: Globe,
    inputs: [
      { name: 'url', label: 'URL', type: 'text' },
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { name: 'body', label: 'Body (JSON)', type: 'textarea', required: false },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false },
    ],
    outputs: [{ name: 'HTTP_RESPONSE', desc: 'API Response Data' }]
  },
  'read_rss': { 
    label: 'Read RSS Feed', category: 'data', icon: Rss,
    inputs: [{ name: 'url', label: 'RSS URL', type: 'text' }],
    outputs: [
      { name: 'RSS_TITLE', desc: 'Post Title' },
      { name: 'RSS_LINK', desc: 'Post URL' },
      { name: 'RSS_CONTENT', desc: 'Full HTML Content' },
      { name: 'RSS_SNIPPET', desc: 'Plain Text Snippet' },
      { name: 'RSS_PUBDATE', desc: 'Publish Date' }
    ]
  },
  'http_scraper': { 
    label: 'Web Scraper', category: 'data', icon: Globe,
    inputs: [
      { name: 'url', label: 'Page URL', type: 'text', placeholder: 'https://...' },
      { name: 'selector', label: 'CSS Selector (Opt)', type: 'text', placeholder: 'article, .main-content', required: false },
    ],
    outputs: [
      { name: 'SCRAPED_TITLE', desc: 'Page Title' },
      { name: 'SCRAPED_CONTENT', desc: 'Cleaned Text Content' }
    ]
  },

  // --- LOGIC ---
  'math_operation': { 
    label: 'Math Operator', category: 'logic', icon: Calculator,
    inputs: [
      { name: 'valueA', label: 'Value A', type: 'text' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['add', 'subtract', 'multiply', 'divide', 'percent'] },
      { name: 'valueB', label: 'Value B', type: 'text' },
    ],
    outputs: [{ name: 'MATH_RESULT', desc: 'Calculation Result' }]
  },
  'transform_data': { 
    label: 'Transform Data', category: 'logic', icon: Variable,
    inputs: [
      { name: 'value', label: 'Input Value', type: 'text' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['upper', 'lower', 'replace', 'parse_number'] },
      { name: 'param', label: 'Param (e.g. search)', type: 'text', required: false },
      { name: 'replaceValue', label: 'Replace With', type: 'text', required: false },
    ],
    outputs: [{ name: 'TRANSFORM_RESULT', desc: 'Transformed Text' }]
  },
  'json_extract': { 
    label: 'JSON Extractor', category: 'logic', icon: FileJson,
    inputs: [
      { name: 'data', label: 'JSON Data', type: 'text', placeholder: '{{HTTP_RESPONSE}}' },
      { name: 'path', label: 'Path', type: 'text', placeholder: 'data.price' },
      { name: 'outputVar', label: 'Output Alias', type: 'text', placeholder: 'MY_VAR', required: false },
    ],
    // Special case: The UI uses the 'sourceField' to name the variable dynamically
    outputs: [{ name: 'dynamic', sourceField: 'outputVar', desc: 'Extracted Value' }]
  },
  'format_date': { 
    label: 'Format Date', category: 'logic', icon: Calendar,
    inputs: [
      { name: 'value', label: 'Timestamp', type: 'text' },
      { name: 'format', label: 'Format', type: 'text', placeholder: 'YYYY-MM-DD', required: false },
    ],
    outputs: [{ name: 'FORMATTED_DATE', desc: 'Formatted Date String' }]
  },

  // --- NOTIFY & OPS (No outputs usually) ---
  'discord_notify': { 
    label: 'Discord Msg', category: 'notify', icon: MessageSquare,
    inputs: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'password' },
      { name: 'message', label: 'Message', type: 'textarea' },
    ]
  },
  'telegram_notify': { 
    label: 'Telegram Msg', category: 'notify', icon: MessageSquare,
    inputs: [
      { name: 'botToken', label: 'Bot Token', type: 'password' },
      { name: 'chatId', label: 'Chat ID', type: 'text' },
      { name: 'message', label: 'Message', type: 'textarea' },
    ]
  },
  'email_send': { 
    label: 'Send Email', category: 'notify', icon: Mail,
    inputs: [
      { name: 'to', label: 'To Email', type: 'text' },
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea' },
      { name: 'smtpHost', label: 'SMTP Host', type: 'text' },
      { name: 'smtpUser', label: 'SMTP User', type: 'text' },
      { name: 'smtpPass', label: 'SMTP Pass', type: 'password' },
    ]
  },
  'update_row': { 
    label: 'Update G-Sheet', category: 'ops', icon: FileSpreadsheet,
    inputs: [
      { name: 'colIndex', label: 'Col Index (0=A)', type: 'number', placeholder: '5' },
      { name: 'value', label: 'Value to Write', type: 'text', placeholder: 'Done' },
    ]
  },
  'condition': {
    label: 'Condition / Logic',
    category: 'logic',
    icon: GitFork,
    inputs: [
      { 
        name: 'rules', 
        type: 'logic-builder', 
        label: 'Logic Flow', 
        required: true 
      }
    ],
    outputs: [] 
  },
  'merge': {
    label: 'Merge / Wait', 
    category: 'logic', 
    icon: GitMerge,
    config: { description: 'Waits for all inputs to complete' },
    inputs: [
      // No inputs needed! It just exists to join paths.
      // But we can add a dummy read-only field for clarity.
      { name: '_info', label: 'Behavior', type: 'text', placeholder: 'Waits for all branches', readOnly: true }
    ],
    outputs: [] // No specific outputs, it passes context through
  },
  'wallet_balance': { 
    label: 'Read Wallet Balance', category: 'web3', icon: Wallet,
    inputs: [
      { name: 'walletAddress', label: 'Wallet Address', type: 'text', placeholder: '0x...' },
      { name: 'token', label: 'Token', type: 'select', options: ['ETH', 'USDC', 'WETH', 'UNI', 'LINK', 'Custom'] },
      { name: 'customToken', label: 'Custom Contract (Opt)', type: 'text', placeholder: '0x...', required: false },
    ],
    outputs: [{ name: 'BALANCE', desc: 'Formatted Token Balance' }]
  },
  // --- AI ---
  'gemini_prompt': { 
    label: 'Gemini LLM', category: 'ai', icon: Sparkles,
    inputs: [
      { name: 'apiKey', label: 'Gemini API Key', type: 'password', required: true },
      { 
        name: 'prompt', 
        label: 'Custom Prompt', 
        type: 'textarea', 
        placeholder: 'Analyze this article and extract the token mentioned: {{node_1.SCRAPED_CONTENT}}' 
      },
      { 
        name: 'schema', 
        label: 'Expected JSON Output (Schema)', 
        type: 'textarea', 
        placeholder: '{\n  "summary": "string",\n  "sentiment": "bullish|bearish|neutral",\n  "token_symbol": "string"\n}' 
      }
    ],
    outputs: [{ name: 'dynamic', sourceField: 'schema', desc: 'Parsed JSON Keys' }] 
  },

  'ai_summarizer': { 
    label: 'Text Summarizer', category: 'ai', icon: FileText,
    inputs: [
      { name: 'apiKey', label: 'Gemini API Key', type: 'password', required: true },
      { name: 'text', label: 'Text to Summarize', type: 'textarea', placeholder: '{{node_1.SCRAPED_CONTENT}}' },
      { name: 'style', label: 'Format Style', type: 'select', options: ['bullet points', 'paragraph', 'tldr', 'tweet'] },
      { name: 'length', label: 'Length', type: 'select', options: ['short', 'medium', 'long'] }
    ],
    outputs: [{ name: 'SUMMARY', desc: 'The summarized text' }] 
  },

  'ai_sentiment': { 
    label: 'Market Sentiment', category: 'ai', icon: TrendingUp,
    inputs: [
      { name: 'apiKey', label: 'Gemini API Key', type: 'password', required: true },
      { name: 'text', label: 'Text to Analyze', type: 'textarea', placeholder: '{{node_1.RSS_CONTENT}}' },
      { name: 'target', label: 'Target Entity/Token (Opt)', type: 'text', placeholder: 'Ethereum', required: false }
    ],
    outputs: [
      { name: 'SENTIMENT', desc: 'BULLISH, BEARISH, or NEUTRAL' },
      { name: 'CONFIDENCE', desc: 'Score from 0-100' },
      { name: 'REASON', desc: '1-sentence explanation' }
    ] 
  },
  'get_memory': { 
    label: 'Recall Memory', category: 'data', icon: Database,
    inputs: [
      { name: 'key', label: 'Memory Key', type: 'text', placeholder: 'last_buy_price' },
      { name: 'defaultValue', label: 'Fallback Value (Opt)', type: 'text', placeholder: '0', required: false },
    ],
    outputs: [{ name: 'VALUE', desc: 'Recalled Data' }]
  },

  'set_memory': { 
    label: 'Save Memory', category: 'data', icon: Save,
    inputs: [
      { name: 'key', label: 'Memory Key', type: 'text', placeholder: 'last_buy_price' },
      { name: 'value', label: 'Value to Save', type: 'text', placeholder: '{{node_1.PRICE}}' },
    ],
    outputs: [{ name: 'SAVED_VALUE', desc: 'Saved Data' }]
  },
  'current_time': {
    label: 'Get Current Time', category: 'data', icon: Clock,
    // No inputs needed! It just captures "Now"
    inputs: [
      { name: '_info', label: 'Info', type: 'text', placeholder: 'Returns ISO, Unix, and Readable time', readOnly: true }
    ],
    outputs: [
      { name: 'ISO', desc: 'ISO 8601 (2024-03-14T...)' },
      { name: 'UNIX', desc: 'Seconds (1710...)' },
      { name: 'READABLE', desc: 'Human Readable String' }
    ]
  },
  'ai_decision': { 
    label: 'AI Decision Router', category: 'ai', icon: GitFork,
    inputs: [
      { name: 'apiKey', label: 'Gemini API Key', type: 'password', required: true },
      { 
        name: 'context', 
        label: 'Context / Situation', 
        type: 'textarea', 
        placeholder: 'Market Sentiment is {{node_1.SENTIMENT}} and Gas is {{node_2.GAS_PRICE}}' 
      },
      { 
        name: 'options', 
        label: 'Valid Options (Comma Sep)', 
        type: 'text', 
        placeholder: 'BUY_ETH, SELL_ETH, WAIT' 
      }
    ],
    outputs: [
      { name: 'DECISION', desc: 'The selected option' },
      { name: 'REASON', desc: 'Why it chose this' }
    ] 
  },
};