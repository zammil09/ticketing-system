// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EventRegistry
/// @notice يخزن بيانات الفعاليات على السلسلة: السعر، عدد التذاكر، ومحفظة استلام الأموال.
contract EventRegistry {
    struct EventData {
        address organizer;      // محفظة المنظّم (تستقبل المدفوعات)
        string name;             // اسم الفعالية
        uint256 price;           // السعر بوحدات mUSDC (6 decimals)
        uint256 maxTickets;      // العدد الكلي للتذاكر المتاحة
        uint256 ticketsSold;     // عدد التذاكر المباعة حتى الآن
        bool active;             // هل الفعالية مفتوحة للبيع
    }

    uint256 private _nextEventId;
    mapping(uint256 => EventData) public events;

    address public owner;
    address public marketplace; // العنوان الوحيد المصرّح له بتحديث عدد التذاكر المباعة

    event EventCreated(uint256 indexed eventId, address indexed organizer, string name, uint256 price, uint256 maxTickets);
    event EventStatusChanged(uint256 indexed eventId, bool active);

    modifier onlyOrganizer(uint256 eventId) {
        require(events[eventId].organizer == msg.sender, "Not the event organizer");
        _;
    }

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Caller is not the marketplace contract");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice يُستدعى مرة واحدة بعد نشر عقد الـ Marketplace لربطه بهذا العقد
    function setMarketplace(address _marketplace) external {
        require(msg.sender == owner, "Only owner");
        require(marketplace == address(0), "Already set");
        marketplace = _marketplace;
    }

    /// @notice إنشاء فعالية جديدة. price بوحدات mUSDC الصغرى (مثال: 10 USDC = 10_000000)
    function createEvent(string calldata name, uint256 price, uint256 maxTickets) external returns (uint256) {
        require(maxTickets > 0, "maxTickets must be > 0");
        require(bytes(name).length > 0, "Name required");

        uint256 eventId = _nextEventId++;
        events[eventId] = EventData({
            organizer: msg.sender,
            name: name,
            price: price,
            maxTickets: maxTickets,
            ticketsSold: 0,
            active: true
        });

        emit EventCreated(eventId, msg.sender, name, price, maxTickets);
        return eventId;
    }

    function setActive(uint256 eventId, bool active) external onlyOrganizer(eventId) {
        events[eventId].active = active;
        emit EventStatusChanged(eventId, active);
    }

    /// @notice يُستدعى فقط من عقد الـ Marketplace بعد كل عملية شراء ناجحة
    function incrementSold(uint256 eventId) external onlyMarketplace {
        EventData storage e = events[eventId];
        require(e.active, "Event is not active");
        require(e.ticketsSold < e.maxTickets, "Sold out");
        e.ticketsSold++;
    }

    function getEvent(uint256 eventId) external view returns (EventData memory) {
        return events[eventId];
    }

    /// @notice عدد الفعاليات الكلي - يُستخدم بالواجهة الأمامية لسرد كل الفعاليات (loop من 0 إلى العدد)
    function totalEvents() external view returns (uint256) {
        return _nextEventId;
    }

    function isAvailable(uint256 eventId) external view returns (bool) {
        EventData memory e = events[eventId];
        return e.active && e.ticketsSold < e.maxTickets;
    }
}
