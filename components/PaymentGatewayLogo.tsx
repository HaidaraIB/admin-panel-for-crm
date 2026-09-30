import React from 'react';

type PaymentGatewayLogoProps = {
    gatewayName: string;
    /** Tailwind height class for the logo image (default h-8 for tables). */
    imageClassName?: string;
    /** Used for PaymentFont fallback (`pf pf-{id}`) when no bundled logo matches. */
    paymentFontKey?: string;
};

function matchGateway(gatewayName: string) {
    const n = gatewayName.toLowerCase();
    return {
        isPaytabs: n.includes('paytabs'),
        isStripe: n.includes('stripe'),
        isZaincash: n.includes('zaincash') || n.includes('zain cash'),
        isQicard: n.includes('qicard') || n.includes('qi card') || n.includes('qi-card'),
        isFib: n.includes('fib') || n.includes('first iraqi'),
        isAlqaseh:
            n.includes('alqaseh') ||
            n.includes('al qaseh') ||
            n.includes('al-qaseh') ||
            n.includes('qaseh'),
    };
}

const PaymentGatewayLogo: React.FC<PaymentGatewayLogoProps> = ({
    gatewayName,
    imageClassName = 'h-8 w-auto object-contain',
    paymentFontKey,
}) => {
    if (!gatewayName.trim()) {
        return <span className="text-gray-400">—</span>;
    }

    const { isPaytabs, isStripe, isZaincash, isQicard, isFib, isAlqaseh } =
        matchGateway(gatewayName);

    if (isPaytabs) {
        return (
            <img
                src="/paytabs_logo.png"
                alt="PayTabs"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }
    if (isStripe) {
        return (
            <img
                src="/stripe_logo.png"
                alt="Stripe"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }
    if (isZaincash) {
        return (
            <img
                src="/zain_cash_logo.png"
                alt="Zain Cash"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }
    if (isQicard) {
        return (
            <img
                src="/q_card_logo.svg"
                alt="QiCard"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }
    if (isFib) {
        return (
            <img
                src="/fib_logo.png"
                alt="FIB"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }
    if (isAlqaseh) {
        return (
            <img
                src="/alqaseh_logo.png"
                alt="Al Qaseh"
                title={gatewayName}
                className={imageClassName}
            />
        );
    }

    const pfKey = (paymentFontKey || gatewayName).toLowerCase();
    return (
        <i
            className={`pf pf-${pfKey} pf-2x text-gray-700 dark:text-gray-300`}
            title={gatewayName}
            aria-label={gatewayName}
        />
    );
};

export default PaymentGatewayLogo;
