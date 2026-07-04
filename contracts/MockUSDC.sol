// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice عملة مستقرة وهمية (6 decimals مثل USDC الحقيقي) تُستخدم فقط للتجربة على الـ testnet.
/// في الإنتاج الفعلي، يُستبدل هذا العقد بعنوان USDC الرسمي على الشبكة المستهدفة.
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Mock USD Coin", "mUSDC") Ownable(msg.sender) {
        // نسك كمية أولية للمالك لتسهيل التجربة
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice دالة "صنبور" (Faucet) تسمح لأي مستخدم بسحب عملة تجريبية لاختبار الشراء
    function faucet(uint256 amount) external {
        require(amount <= 1000 * 10 ** _DECIMALS, "Faucet limit: 1000 mUSDC max");
        _mint(msg.sender, amount);
    }
}
