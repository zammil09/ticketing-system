const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Blockchain Ticketing System", function () {
  let usdc, registry, ticketNFT, marketplace;
  let owner, organizer, buyer;

  beforeEach(async function () {
    [owner, organizer, buyer] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const EventRegistry = await ethers.getContractFactory("EventRegistry");
    registry = await EventRegistry.deploy();

    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    ticketNFT = await TicketNFT.deploy();

    const TicketMarketplace = await ethers.getContractFactory("TicketMarketplace");
    marketplace = await TicketMarketplace.deploy(
      await usdc.getAddress(),
      await registry.getAddress(),
      await ticketNFT.getAddress()
    );

    await ticketNFT.setMarketplace(await marketplace.getAddress());
    await registry.setMarketplace(await marketplace.getAddress());

    // إعطاء المشتري رصيد mUSDC للتجربة
    await usdc.connect(buyer).faucet(ethers.parseUnits("100", 6));
  });

  it("ينشئ المنظّم فعالية بنجاح", async function () {
    await registry.connect(organizer).createEvent("New Year's Party", ethers.parseUnits("10", 6), 100);
    const ev = await registry.getEvent(0);
    expect(ev.name).to.equal("New Year's Party");
    expect(ev.organizer).to.equal(organizer.address);
  });

  it("يشتري المستخدم تذكرة بنجاح ويستلم NFT، والمنظّم يستلم الدفع", async function () {
    await registry.connect(organizer).createEvent("New Year's Party", ethers.parseUnits("10", 6), 100);

    await usdc.connect(buyer).approve(await marketplace.getAddress(), ethers.parseUnits("10", 6));

    const organizerBalanceBefore = await usdc.balanceOf(organizer.address);

    const tx = await marketplace.connect(buyer).buyTicket(0);
    await tx.wait();

    // تحقق من ملكية NFT
    expect(await ticketNFT.ownerOf(0)).to.equal(buyer.address);

    // تحقق من استلام المنظّم للدفع
    const organizerBalanceAfter = await usdc.balanceOf(organizer.address);
    expect(organizerBalanceAfter - organizerBalanceBefore).to.equal(ethers.parseUnits("10", 6));

    // تحقق من تحديث عدد التذاكر المباعة
    const ev = await registry.getEvent(0);
    expect(ev.ticketsSold).to.equal(1);
  });

  it("يفشل الشراء إذا لم يوافق المستخدم على الدفع مسبقاً (approve)", async function () {
    await registry.connect(organizer).createEvent("New Year's Party", ethers.parseUnits("10", 6), 100);
    await expect(marketplace.connect(buyer).buyTicket(0)).to.be.reverted;
  });

  it("يمنع بيع تذاكر أكثر من الحد الأقصى (sold out)", async function () {
    await registry.connect(organizer).createEvent("Small Event", ethers.parseUnits("5", 6), 1);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), ethers.parseUnits("10", 6));

    await marketplace.connect(buyer).buyTicket(0); // أول تذكرة تنجح

    await expect(marketplace.connect(buyer).buyTicket(0)).to.be.revertedWith("Event sold out");
  });

  it("يمنع استخدام نفس التذكرة مرتين عند تسجيل الدخول (check-in)", async function () {
    await registry.connect(organizer).createEvent("Party", ethers.parseUnits("5", 6), 10);
    await usdc.connect(buyer).approve(await marketplace.getAddress(), ethers.parseUnits("5", 6));
    await marketplace.connect(buyer).buyTicket(0);

    await ticketNFT.checkIn(0);
    await expect(ticketNFT.checkIn(0)).to.be.revertedWith("Ticket already used");
  });
});
