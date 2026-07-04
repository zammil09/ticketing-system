// ============================================================
// ⚠️ عبّي هذي العناوين بعد تنفيذ: npm run deploy:sepolia
// راح تطلع لك بالـ terminal بعد نجاح النشر
// ============================================================
const CONTRACT_ADDRESSES = {
  USDC: "0x566E7922043d8d4B58711b0B1113Ad1e8F63521e",
  REGISTRY: "0xB7A33bBF21917e02C0d9de05Fb97E84294De547a",
  TICKET_NFT: "0x4b4D732904225aEBf7b7a7c39C537E767F79c024",
  MARKETPLACE: "0x84e90b365f076B161B8F754DCbeb6E90A88ffc6D",
};

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

// عنوان الـ Backend API (شغّله أولاً: cd backend && npm run dev)
const BACKEND_URL = "http://localhost:4000/api";

// ===== ABIs (تحتوي فقط الدوال والأحداث التي تستخدمها الواجهة) =====

const USDC_ABI = [
  { "constant": true, "inputs": [], "name": "decimals", "outputs": [{ "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "constant": true, "inputs": [{ "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "constant": false, "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "constant": false, "inputs": [{ "name": "amount", "type": "uint256" }], "name": "faucet", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

const REGISTRY_ABI = [
  {
    "inputs": [{ "name": "name", "type": "string" }, { "name": "price", "type": "uint256" }, { "name": "maxTickets", "type": "uint256" }],
    "name": "createEvent", "outputs": [{ "type": "uint256" }], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "name": "eventId", "type": "uint256" }],
    "name": "getEvent",
    "outputs": [{
      "components": [
        { "name": "organizer", "type": "address" },
        { "name": "name", "type": "string" },
        { "name": "price", "type": "uint256" },
        { "name": "maxTickets", "type": "uint256" },
        { "name": "ticketsSold", "type": "uint256" },
        { "name": "active", "type": "bool" }
      ], "name": "", "type": "tuple"
    }], "stateMutability": "view", "type": "function"
  },
  {
    "anonymous": false, "name": "EventCreated", "type": "event",
    "inputs": [
      { "indexed": true, "name": "eventId", "type": "uint256" },
      { "indexed": true, "name": "organizer", "type": "address" },
      { "indexed": false, "name": "name", "type": "string" },
      { "indexed": false, "name": "price", "type": "uint256" },
      { "indexed": false, "name": "maxTickets", "type": "uint256" }
    ]
  }
];

const TICKET_NFT_ABI = [
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "type": "address" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "ticketInfo",
    "outputs": [{ "name": "eventId", "type": "uint256" }, { "name": "checkedIn", "type": "bool" }],
    "stateMutability": "view", "type": "function"
  },
  { "inputs": [{ "name": "tokenId", "type": "uint256" }], "name": "checkIn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  {
    "anonymous": false, "name": "Transfer", "type": "event",
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": true, "name": "tokenId", "type": "uint256" }
    ]
  }
];

const MARKETPLACE_ABI = [
  { "inputs": [{ "name": "eventId", "type": "uint256" }], "name": "buyTicket", "outputs": [{ "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  {
    "anonymous": false, "name": "TicketPurchased", "type": "event",
    "inputs": [
      { "indexed": true, "name": "eventId", "type": "uint256" },
      { "indexed": true, "name": "tokenId", "type": "uint256" },
      { "indexed": true, "name": "buyer", "type": "address" },
      { "indexed": false, "name": "organizer", "type": "address" },
      { "indexed": false, "name": "pricePaid", "type": "uint256" }
    ]
  }
];
