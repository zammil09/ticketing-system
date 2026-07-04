// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./EventRegistry.sol";
import "./TicketNFT.sol";

/// @title TicketMarketplace
/// @notice العقد المركزي الذي يربط الدفع بالعملة المستقرة مع سك تذكرة NFT في عملية واحدة ذرية.
/// إما أن تنجح كل الخطوات (تحويل الأموال + سك التذكرة) معاً، أو تفشل كل العملية بالكامل (rollback تلقائي).
contract TicketMarketplace is ReentrancyGuard {
    IERC20 public immutable stablecoin;       // عقد mUSDC / USDC
    EventRegistry public immutable registry;  // عقد إدارة الفعاليات
    TicketNFT public immutable ticketNFT;     // عقد التذاكر NFT

    event TicketPurchased(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        address indexed buyer,
        address organizer,
        uint256 pricePaid
    );

    constructor(address _stablecoin, address _registry, address _ticketNFT) {
        stablecoin = IERC20(_stablecoin);
        registry = EventRegistry(_registry);
        ticketNFT = TicketNFT(_ticketNFT);
    }

    /// @notice شراء تذكرة لفعالية معيّنة.
    /// الشرط المسبق: يجب على المشتري استدعاء stablecoin.approve(marketplaceAddress, price) قبل هذا الاستدعاء.
    function buyTicket(uint256 eventId) external nonReentrant returns (uint256 tokenId) {
        EventRegistry.EventData memory ev = registry.getEvent(eventId);

        require(ev.active, "Event is not active");
        require(ev.ticketsSold < ev.maxTickets, "Event sold out");
        require(ev.organizer != address(0), "Event does not exist");

        // ===== الخطوة ١: تحويل الدفع من المشتري مباشرة لمحفظة المنظّم =====
        bool sent = stablecoin.transferFrom(msg.sender, ev.organizer, ev.price);
        require(sent, "Stablecoin transfer failed");

        // ===== الخطوة ٢: تحديث عدد التذاكر المباعة في سجل الفعالية =====
        registry.incrementSold(eventId);

        // ===== الخطوة ٣: سك تذكرة NFT للمشتري =====
        tokenId = ticketNFT.mintTicket(msg.sender, eventId);

        // إذا فشلت أي خطوة أعلاه، فإن كامل الـ transaction يُلغى تلقائياً (خاصية EVM)
        // ما يضمن استحالة سيناريو "دفعت ولم تصلني تذكرة"

        emit TicketPurchased(eventId, tokenId, msg.sender, ev.organizer, ev.price);
    }
}
