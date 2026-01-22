import { Globe, Zap, Target, TrendingUp, Shield, Cpu } from 'lucide-react';

export const ASSETS = {
    // Icons from user's provided design (kept compatible if needed later, but we focus on strategyIcons/personas)
    recommendation: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/ti34aombIV/zp7uywub_expires_30_days.png",
    citations: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/ti34aombIV/izpk4e7a_expires_30_days.png",
    keyFindings: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/ti34aombIV/q6fd05yd_expires_30_days.png",

    personas: {
        one: "https://api.dicebear.com/7.x/notionists/svg?seed=Felix",
        two: "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka",
        three: "https://api.dicebear.com/7.x/notionists/svg?seed=Milo",
    },
    strategyIcons: {
        domain: Globe,
        purpose: Zap,
        target: Target,
        // Additional mappings if needed based on loose requirements
        goals: TrendingUp,
        challenges: Shield,
        tech: Cpu
    },
    // Header/Divider assets
    headerLogo: "/logo.png",
};
