// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TicketNFT
/// @notice كل تذكرة = NFT فريد (ERC-721). يُسمح فقط لعقد الـ Marketplace بسك التذاكر
/// لضمان أن كل تذكرة مرتبطة فعلياً بعملية دفع تمت والتحقق منها.
contract TicketNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    // عنوان عقد الـ Marketplace المصرّح له وحده بالسك (mint)
    address public marketplace;

    struct TicketData {
        uint256 eventId;
        bool checkedIn; // يمنع استخدام نفس التذكرة مرتين عند الدخول
    }

    mapping(uint256 => TicketData) public ticketInfo;

    event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address indexed buyer);
    event TicketCheckedIn(uint256 indexed tokenId);

    modifier onlyMarketplace() {
        require(msg.sender == marketplace, "Caller is not the marketplace contract");
        _;
    }

    constructor() ERC721("EventTicket", "TKT") Ownable(msg.sender) {}

    /// @notice يُستدعى مرة واحدة بعد نشر عقد الـ Marketplace لربطه بهذا العقد
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid address");
        marketplace = _marketplace;
    }

    /// @notice سك تذكرة جديدة - يُستدعى فقط من داخل عقد الـ Marketplace بعد نجاح الدفع
    function mintTicket(address to, uint256 eventId) external onlyMarketplace returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        ticketInfo[tokenId] = TicketData({eventId: eventId, checkedIn: false});
        emit TicketMinted(tokenId, eventId, to);
        return tokenId;
    }

    /// @notice تسجيل الدخول عند بوابة الفعالية - يمنع إعادة استخدام نفس التذكرة
    /// في التطبيق الفعلي يُستدعى هذا عبر حساب تابع لمنظّم الفعالية (organizer-controlled scanner)
    function checkIn(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Ticket does not exist");
        require(!ticketInfo[tokenId].checkedIn, "Ticket already used");
        ticketInfo[tokenId].checkedIn = true;
        emit TicketCheckedIn(tokenId);
    }

    function isCheckedIn(uint256 tokenId) external view returns (bool) {
        return ticketInfo[tokenId].checkedIn;
    }
}
