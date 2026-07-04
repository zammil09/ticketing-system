const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("النشر باستخدام الحساب:", deployer.address);

  // ===== 1) نشر عملة الاختبار MockUSDC =====
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("MockUSDC deployed:", await usdc.getAddress());

  // ===== 2) نشر عقد إدارة الفعاليات =====
  const EventRegistry = await hre.ethers.getContractFactory("EventRegistry");
  const registry = await EventRegistry.deploy();
  await registry.waitForDeployment();
  console.log("EventRegistry deployed:", await registry.getAddress());

  // ===== 3) نشر عقد التذاكر NFT =====
  const TicketNFT = await hre.ethers.getContractFactory("TicketNFT");
  const ticketNFT = await TicketNFT.deploy();
  await ticketNFT.waitForDeployment();
  console.log("TicketNFT deployed:", await ticketNFT.getAddress());

  // ===== 4) نشر عقد الـ Marketplace وربطه بالعقود الثلاثة أعلاه =====
  const TicketMarketplace = await hre.ethers.getContractFactory("TicketMarketplace");
  const marketplace = await TicketMarketplace.deploy(
    await usdc.getAddress(),
    await registry.getAddress(),
    await ticketNFT.getAddress()
  );
  await marketplace.waitForDeployment();
  console.log("TicketMarketplace deployed:", await marketplace.getAddress());

  // ===== 5) ربط الصلاحيات: فقط الـ Marketplace يقدر يسك تذاكر ويحدّث المبيعات =====
  await (await ticketNFT.setMarketplace(await marketplace.getAddress())).wait();
  await (await registry.setMarketplace(await marketplace.getAddress())).wait();
  console.log("تم ربط صلاحيات Marketplace بنجاح");

  console.log("\n===== ملخص العناوين (احفظها في .env و frontend/.env) =====");
  console.log("VITE_USDC_ADDRESS=", await usdc.getAddress());
  console.log("VITE_REGISTRY_ADDRESS=", await registry.getAddress());
  console.log("VITE_TICKET_NFT_ADDRESS=", await ticketNFT.getAddress());
  console.log("VITE_MARKETPLACE_ADDRESS=", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
