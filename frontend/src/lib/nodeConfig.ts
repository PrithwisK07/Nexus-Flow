import { 
  Zap, ArrowRightLeft, Database, Calculator, MessageSquare, Mail, 
  FileSpreadsheet, Layers, Search, Globe, Rss, Clock, Fingerprint, 
  Variable, FileJson, Calendar, Flame, Send
} from 'lucide-react';

// --- THEME MAPPING ---
export const CATEGORY_COLORS: Record<string, any> = {
  trigger: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', accent: 'bg-amber-500' },
  web3:   { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', accent: 'bg-indigo-500' },
  data:   { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', accent: 'bg-emerald-500' },
  logic:  { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', accent: 'bg-slate-500' },
  notify: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', accent: 'bg-rose-500' },
  ops:    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', accent: 'bg-blue-500' },
};

// --- COMPLETE 18-NODE CONFIGURATION ---
export const NODE_TYPES: Record<string, any> = {
  
  // 1. TRIGGERS & CORE
  'webhook': { 
    label: 'Webhook Trigger', category: 'trigger', icon: Zap,
    inputs: [{ name: 'triggerId', label: 'Webhook ID', type: 'text', readOnly: true }] 
  },

  // 2. WEB3 TRANSACTIONS
  'transfer': { 
    label: 'Transfer Token', category: 'web3', icon: Send,
    inputs: [
      { name: 'toAddress', label: 'To Address', type: 'text', placeholder: '0x... or {{Wallet}}' },
      { name: 'amount', label: 'Amount', type: 'text', placeholder: '1.5' },
      { name: 'currency', label: 'Token Symbol', type: 'text', placeholder: 'ETH, USDC...' },
      { name: 'decimals', label: 'Decimals (Optional)', type: 'number', placeholder: '18' },
    ]
  },
  'swap_uniswap': { 
    label: 'Uniswap Swap', category: 'web3', icon: ArrowRightLeft,
    inputs: [
      { name: 'tokenIn', label: 'Token In (Addr)', type: 'text', placeholder: '0x...' },
      { name: 'tokenOut', label: 'Token Out (Addr)', type: 'text', placeholder: '0x...' },
      { name: 'amountIn', label: 'Amount In', type: 'text', placeholder: '100' },
      { name: 'recipient', label: 'Recipient', type: 'text', placeholder: '0x...' },
      { name: 'tokenInDecimals', label: 'In Decimals', type: 'number', placeholder: '18' },
    ]
  },
  'aave_supply': { 
    label: 'Aave Supply', category: 'web3', icon: Layers,
    inputs: [
      { name: 'asset', label: 'Asset Address', type: 'text', placeholder: '0x...' },
      { name: 'amount', label: 'Amount', type: 'text' },
      { name: 'onBehalfOf', label: 'On Behalf Of', type: 'text', placeholder: '0x...' },
    ]
  },

  // 3. GENERIC CHAIN TOOLS
  'read_contract': { 
    label: 'Read Contract', category: 'web3', icon: Search,
    inputs: [
      { name: 'contractAddress', label: 'Contract Address', type: 'text' },
      { name: 'functionSignature', label: 'Function Sig', type: 'text', placeholder: 'balanceOf(address)' },
      { name: 'args', label: 'Arguments (Comma Sep)', type: 'text', placeholder: '0x123, 5' },
    ]
  },
  'write_contract': { 
    label: 'Write Contract', category: 'web3', icon: Fingerprint,
    inputs: [
      { name: 'contractAddress', label: 'Contract Address', type: 'text' },
      { name: 'functionSignature', label: 'Function Sig', type: 'text', placeholder: 'approve(address,uint256)' },
      { name: 'args', label: 'Arguments', type: 'text' },
      { name: 'value', label: 'ETH Value (Wei)', type: 'text', placeholder: '0' },
    ]
  },
  'resolve_ens': { 
    label: 'Resolve ENS', category: 'web3', icon: Search,
    inputs: [{ name: 'domain', label: 'ENS Domain', type: 'text', placeholder: 'vitalik.eth' }] 
  },
  'get_gas_price': { 
    label: 'Get Gas Price', category: 'data', icon: Flame,
    inputs: [] // No inputs needed, just outputs GAS_PRICE_GWEI
  },

  // 4. DATA & UTILS
  'get_price': { 
    label: 'Get Token Price', category: 'data', icon: Database,
    inputs: [{ name: 'tokenId', label: 'Coingecko ID', type: 'text', placeholder: 'ethereum, bitcoin' }] 
  },
  'http_request': { 
    label: 'HTTP Request', category: 'data', icon: Globe,
    inputs: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com' },
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { name: 'body', label: 'Body (JSON)', type: 'textarea' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea' },
    ]
  },
  'read_rss': { 
    label: 'Read RSS Feed', category: 'data', icon: Rss,
    inputs: [{ name: 'url', label: 'RSS URL', type: 'text' }] 
  },

  // 5. LOGIC & TRANSFORMATION
  'math_operation': { 
    label: 'Math Operator', category: 'logic', icon: Calculator,
    inputs: [
      { name: 'valueA', label: 'Value A', type: 'text' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['add', 'subtract', 'multiply', 'divide', 'percent'] },
      { name: 'valueB', label: 'Value B', type: 'text' },
    ]
  },
  'transform_data': { 
    label: 'Transform Text', category: 'logic', icon: Variable,
    inputs: [
      { name: 'value', label: 'Input Value', type: 'text' },
      { name: 'operation', label: 'Operation', type: 'select', options: ['upper', 'lower', 'replace', 'parse_number'] },
      { name: 'param', label: 'Param (e.g. search text)', type: 'text' },
      { name: 'replaceValue', label: 'Replace With', type: 'text' },
    ]
  },
  'json_extract': { 
    label: 'JSON Extractor', category: 'logic', icon: FileJson,
    inputs: [
      { name: 'data', label: 'JSON Data', type: 'text', placeholder: '{{HTTP_RESPONSE}}' },
      { name: 'path', label: 'Path', type: 'text', placeholder: 'data.items.0.price' },
      { name: 'outputVar', label: 'Output Alias', type: 'text', placeholder: 'MY_PRICE' },
    ]
  },
  'format_date': { 
    label: 'Format Date', category: 'logic', icon: Calendar,
    inputs: [
      { name: 'value', label: 'Date/Timestamp', type: 'text' },
      { name: 'format', label: 'Format', type: 'text', placeholder: 'YYYY-MM-DD HH:mm' },
    ]
  },

  // 6. NOTIFICATIONS & OPS
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
      { name: 'smtpHost', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { name: 'smtpUser', label: 'SMTP User', type: 'text' },
      { name: 'smtpPass', label: 'SMTP Pass', type: 'password' },
    ]
  },
  'update_row': { 
    label: 'Update G-Sheet', category: 'ops', icon: FileSpreadsheet,
    inputs: [
      { name: 'colIndex', label: 'Column Index (0=A)', type: 'number' },
      { name: 'value', label: 'Value to Write', type: 'text' },
    ]
  },
};