import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, Camera, Map, Users, Sparkles, Globe, Route, Check, Infinity, Loader2, CreditCard, Settings, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TOSS_CLIENT_KEY = "test_ck_eqRGgYO1r5KB91YYpepb3QnN2Eya";

const plans = [
  { id: "monthly", name: "월간 구독", price: "₩4,900", period: "/월", desc: "매월 자동 결제", highlight: false },
  { id: "yearly", name: "연간 구독", price: "₩39,000", period: "/년", desc: "월 ₩3,250 · 33% 할인", highlight: true, badge: "BEST" },
  { id: "lifetime", name: "평생 이용권", price: "₩99,000", period: "", desc: "한 번 결제로 영구 사용", highlight: false, badge: "영구" },
];

const features = [
  { icon: Camera, title: "무제한 고화질 사진", desc: "원본 화질 그대로 무제한 업로드 · 백업", free: "월 50장 (압축)", premium: "무제한 (원본)" },
  { icon: Map, title: "프리미엄 지도 테마", desc: "감성 지도 스킨, 커스텀 마커 색상 선택", free: "기본 테마", premium: "12+ 테마" },
  { icon: Users, title: "대규모 그룹", desc: "더 많은 친구와 함께 추억을 공유", free: "그룹당 5명", premium: "그룹당 50명" },
  { icon: Sparkles, title: "AI 여행 추천", desc: "체크인 기록 기반 맞춤 여행지 추천", free: "—", premium: "무제한" },
  { icon: Globe, title: "커스텀 공유 링크", desc: "나만의 도메인으로 추억 공유 페이지 생성", free: "—", premium: "사용 가능" },
  { icon: Route, title: "스마트 동선 최적화", desc: "마커 기반 방문 순서·거리를 고려한 최적 경로 추천", free: "—", premium: "무제한" },
];

type PaymentMethod = "stripe" | "toss";

const PremiumPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPremium, plan: currentPlan, subscriptionEnd, refresh: refreshPremium } = usePremiumStatus();
  const [processing, setProcessing] = useState(false);
  const [managingPortal, setManagingPortal] = useState(false);
  const [cancelingToss, setCancelingToss] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("yearly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  // Handle return from Stripe checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "결제 완료! 🎉", description: "프리미엄이 활성화되었습니다." });
      refreshPremium();
    } else if (searchParams.get("canceled") === "true") {
      toast({ title: "결제가 취소되었습니다", variant: "destructive" });
    }
  }, [searchParams]);

  const handleStripeCheckout = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: selectedPlan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "결제 오류", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleTossCheckout = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-toss-payment", {
        body: { plan: selectedPlan },
      });
      if (error) throw error;

      // Load Toss Payments SDK via script tag
      const loadTossSDK = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          if ((window as any).TossPayments) {
            resolve((window as any).TossPayments);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://js.tosspayments.com/v2/standard";
          script.onload = () => resolve((window as any).TossPayments);
          script.onerror = () => reject(new Error("토스페이먼츠 SDK 로드 실패"));
          document.head.appendChild(script);
        });
      };

      const TossPayments = await loadTossSDK();
      const tossPayments = TossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: user.id });

      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: data.amount },
        orderId: data.orderId,
        orderName: data.orderName,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        successUrl: `${window.location.origin}/premium?toss_success=true&plan=${selectedPlan}`,
        failUrl: `${window.location.origin}/premium?toss_fail=true`,
      });
    } catch (err: any) {
      if (err?.code !== "USER_CANCEL") {
        toast({ title: "결제 오류", description: err.message || "결제에 실패했습니다.", variant: "destructive" });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle Toss payment callback
  useEffect(() => {
    const confirmToss = async () => {
      if (searchParams.get("toss_success") !== "true") return;
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");
      const plan = searchParams.get("plan");

      if (!paymentKey || !orderId || !amount) return;

      try {
        const { data, error } = await supabase.functions.invoke("confirm-toss-payment", {
          body: { paymentKey, orderId, amount: Number(amount), plan },
        });
        if (error) throw error;
        toast({ title: "결제 완료! 🎉", description: "프리미엄이 활성화되었습니다." });
        refreshPremium();
      } catch (err: any) {
        toast({ title: "결제 확인 실패", description: err.message, variant: "destructive" });
      }
    };

    confirmToss();

    if (searchParams.get("toss_fail") === "true") {
      toast({ title: "결제가 실패했습니다", variant: "destructive" });
    }
  }, [searchParams]);

  const handleManageSubscription = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    } finally {
      setManagingPortal(false);
    }
  };

  const handleCancelTossSubscription = async () => {
    if (!user) return;
    setCancelingToss(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      toast({ title: "구독이 해지되었습니다", description: "현재 결제 기간이 끝나면 프리미엄이 종료됩니다." });
      refreshPremium();
    } catch (err: any) {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    } finally {
      setCancelingToss(false);
    }
  };

  const handleSubscribe = () => {
    if (paymentMethod === "stripe") {
      handleStripeCheckout();
    } else {
      handleTossCheckout();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground font-display">프리미엄</h1>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent p-6 mb-8"
        >
          <div className="absolute top-3 right-3 opacity-20">
            <Crown className="w-24 h-24 text-primary-foreground" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground/80">PREMIUM</span>
            </div>
            <h2 className="text-2xl font-bold text-primary-foreground mb-1">더 특별한 추억을 위해</h2>
            <p className="text-sm text-primary-foreground/70">고화질 사진, AI 추천, 커스텀 테마까지</p>
          </div>
        </motion.div>

        {/* Plans */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">요금제 선택</h3>
          <div className="space-y-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                onClick={() => !isPremium && setSelectedPlan(plan.id)}
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-primary shadow-md shadow-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40"
                } ${isPremium && currentPlan === plan.id ? "ring-2 ring-primary/50" : ""}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {plan.id === "lifetime" ? <Infinity className="w-5 h-5" /> : <Crown className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                        {plan.badge && (
                          <Badge variant={plan.highlight ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {plan.badge}
                          </Badge>
                        )}
                        {isPremium && currentPlan === plan.id && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-0">이용 중</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Payment Method Selection */}
        {!isPremium && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">결제 수단</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("stripe")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "stripe"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <CreditCard className={`w-6 h-6 ${paymentMethod === "stripe" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${paymentMethod === "stripe" ? "text-primary" : "text-foreground"}`}>
                  Stripe
                </span>
                <span className="text-[10px] text-muted-foreground">카드 / Google Pay</span>
              </button>
              <button
                onClick={() => setPaymentMethod("toss")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  paymentMethod === "toss"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className={`text-2xl`}>💳</span>
                <span className={`text-sm font-medium ${paymentMethod === "toss" ? "text-primary" : "text-foreground"}`}>
                  토스페이먼츠
                </span>
                <span className="text-[10px] text-muted-foreground">카드 / 계좌이체 / 간편결제</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Feature comparison */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">프리미엄 혜택</h3>
          <div className="space-y-3">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <feat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{feat.title}</p>
                    <p className="text-xs text-muted-foreground">{feat.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted">
                    <span className="text-muted-foreground">무료</span>
                    <span className="ml-auto font-medium text-foreground">{feat.free}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <span className="ml-auto font-medium text-primary">{feat.premium}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 space-y-3">
          {isPremium ? (
            <>
              <div className="text-center p-5 rounded-xl bg-primary/10 border border-primary/20">
                <Crown className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground">프리미엄 이용 중</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentPlan === "lifetime"
                    ? "평생 이용권을 사용 중입니다."
                    : subscriptionEnd
                    ? `다음 갱신일: ${new Date(subscriptionEnd).toLocaleDateString("ko-KR")}`
                    : "모든 프리미엄 기능을 이용하고 있습니다!"}
                </p>
              </div>

              {/* Stripe subscription management */}
              {currentPlan !== "lifetime" && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={managingPortal}
                  className="w-full h-12 rounded-xl text-base gap-2"
                >
                  {managingPortal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                  구독 관리 (플랜 변경 · 해지)
                </Button>
              )}

              {/* Toss subscription cancel */}
              {currentPlan && currentPlan !== "lifetime" && (
                <Button
                  variant="ghost"
                  onClick={handleCancelTossSubscription}
                  disabled={cancelingToss}
                  className="w-full h-10 rounded-xl text-sm text-destructive hover:text-destructive gap-2"
                >
                  {cancelingToss ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  토스 구독 해지
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleSubscribe}
                disabled={processing}
                className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                {processing ? "처리 중..." : paymentMethod === "stripe" ? "Stripe로 결제하기" : "토스페이먼츠로 결제하기"}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                언제든지 해지 가능 · 안전한 결제
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PremiumPage;
