const { Web3 } = require("web3");
const pool = require("./db");
const { REGISTRY_ABI, MARKETPLACE_ABI, TICKET_NFT_ABI } = require("./abi");
require("dotenv").config();

const web3 = new Web3(process.env.SEPOLIA_RPC_URL);

const registry = new web3.eth.Contract(REGISTRY_ABI, process.env.REGISTRY_ADDRESS);
const marketplace = new web3.eth.Contract(MARKETPLACE_ABI, process.env.MARKETPLACE_ADDRESS);
const ticketNFT = new web3.eth.Contract(TICKET_NFT_ABI, process.env.TICKET_NFT_ADDRESS);

const POLL_INTERVAL_MS = 15_000; // كل 15 ثانية يفحص بلوكات جديدة
const MAX_BLOCK_RANGE = 5000;    // يمنع طلب نطاق ضخم جداً بمرة وحدة (حد بعض مزودي RPC)

async function getLastProcessedBlock(contractName, deployBlock) {
  const res = await pool.query(
    "SELECT last_processed_block FROM indexer_state WHERE contract_name = $1",
    [contractName]
  );
  if (res.rows.length === 0) {
    await pool.query(
      "INSERT INTO indexer_state (contract_name, last_processed_block) VALUES ($1, $2)",
      [contractName, deployBlock]
    );
    return deployBlock;
  }
  return Number(res.rows[0].last_processed_block);
}

async function setLastProcessedBlock(contractName, block) {
  await pool.query(
    "UPDATE indexer_state SET last_processed_block = $1 WHERE contract_name = $2",
    [block, contractName]
  );
}

// ===== معالجة أحداث EventRegistry =====
async function processRegistryEvents() {
  const deployBlock = Number(process.env.DEPLOY_BLOCK || 0);
  const fromBlock = (await getLastProcessedBlock("registry", deployBlock)) + 1;
  const latest = Number(await web3.eth.getBlockNumber());
  if (fromBlock > latest) return;

  const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE, latest);

  const created = await registry.getPastEvents("EventCreated", { fromBlock, toBlock });
  for (const log of created) {
    const { eventId, organizer, name, price, maxTickets } = log.returnValues;
    await pool.query(
      `INSERT INTO events (event_id, organizer_address, name, price_units, max_tickets, tx_hash, block_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, organizer.toLowerCase(), name, price, maxTickets, log.transactionHash, log.blockNumber]
    );
    console.log(`[registry] فعالية جديدة #${eventId}: ${name}`);
  }

  const statusChanged = await registry.getPastEvents("EventStatusChanged", { fromBlock, toBlock });
  for (const log of statusChanged) {
    const { eventId, active } = log.returnValues;
    await pool.query("UPDATE events SET active = $1 WHERE event_id = $2", [active, eventId]);
  }

  await setLastProcessedBlock("registry", toBlock);
}

// ===== معالجة أحداث TicketMarketplace =====
async function processMarketplaceEvents() {
  const deployBlock = Number(process.env.DEPLOY_BLOCK || 0);
  const fromBlock = (await getLastProcessedBlock("marketplace", deployBlock)) + 1;
  const latest = Number(await web3.eth.getBlockNumber());
  if (fromBlock > latest) return;

  const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE, latest);

  const purchases = await marketplace.getPastEvents("TicketPurchased", { fromBlock, toBlock });
  for (const log of purchases) {
    const { eventId, tokenId, buyer, pricePaid } = log.returnValues;

    await pool.query(
      `INSERT INTO tickets (token_id, event_id, owner_address, purchase_price_units, tx_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token_id) DO NOTHING`,
      [tokenId, eventId, buyer.toLowerCase(), pricePaid, log.transactionHash]
    );

    await pool.query(
      "UPDATE events SET tickets_sold = tickets_sold + 1 WHERE event_id = $1",
      [eventId]
    );

    console.log(`[marketplace] تذكرة #${tokenId} بيعت لفعالية #${eventId}`);
  }

  await setLastProcessedBlock("marketplace", toBlock);
}

// ===== معالجة أحداث TicketNFT (تحويل ملكية + تسجيل دخول) =====
async function processTicketNftEvents() {
  const deployBlock = Number(process.env.DEPLOY_BLOCK || 0);
  const fromBlock = (await getLastProcessedBlock("ticketNFT", deployBlock)) + 1;
  const latest = Number(await web3.eth.getBlockNumber());
  if (fromBlock > latest) return;

  const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE, latest);

  // تحديث المالك عند أي تحويل لاحق (إعادة بيع مثلاً) — نتجاهل السك الأصلي (from = 0x0) لأنه مُعالَج أصلاً بـ TicketPurchased
  const transfers = await ticketNFT.getPastEvents("Transfer", { fromBlock, toBlock });
  for (const log of transfers) {
    const { from, to, tokenId } = log.returnValues;
    if (from === "0x0000000000000000000000000000000000000000") continue;
    await pool.query("UPDATE tickets SET owner_address = $1 WHERE token_id = $2", [to.toLowerCase(), tokenId]);
  }

  const checkins = await ticketNFT.getPastEvents("TicketCheckedIn", { fromBlock, toBlock });
  for (const log of checkins) {
    const { tokenId } = log.returnValues;
    await pool.query(
      "UPDATE tickets SET checked_in = TRUE, checked_in_at = NOW() WHERE token_id = $1",
      [tokenId]
    );
    console.log(`[ticketNFT] تسجيل دخول للتذكرة #${tokenId}`);
  }

  await setLastProcessedBlock("ticketNFT", toBlock);
}

async function runIndexerLoop() {
  try {
    await processRegistryEvents();
    await processMarketplaceEvents();
    await processTicketNftEvents();
  } catch (err) {
    console.error("خطأ بدورة الـ Indexer:", err.message);
  } finally {
    setTimeout(runIndexerLoop, POLL_INTERVAL_MS);
  }
}

function startIndexer() {
  console.log("🔄 بدء تشغيل الـ Indexer — يفحص السلسلة كل", POLL_INTERVAL_MS / 1000, "ثانية");
  runIndexerLoop();
}

module.exports = { startIndexer };
