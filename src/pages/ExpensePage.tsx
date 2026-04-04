import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Receipt, BarChart3, Calculator, Loader2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Expense {
  id: string;
  group_id: string;
  user_id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  created_at: string;
  user_name?: string;
  user_emoji?: string;
}

interface ExchangeRates {
  toKRW: { KRW: number; USD: number; JPY: number };
  updated_at: string;
  fallback?: boolean;
}

const CATEGORIES = ["식비", "교통", "숙박", "관광", "쇼핑", "기타"];
const CURRENCY_SYMBOLS: Record<string, string> = { KRW: "₩", USD: "$", JPY: "¥" };
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

const ExpensePage = () => {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const groupName = searchParams.get("groupName") || "그룹";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [members, setMembers] = useState<{ user_id: string; display_name: string; avatar_emoji: string }[]>([]);

  // Form state
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("기타");
  const [submitting, setSubmitting] = useState(false);

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!groupId || !user) return;
    fetchExpenses();
    fetchMembers();
    fetchRates();
  }, [groupId, user]);

  const fetchRates = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("exchange-rates");
      if (error) throw error;
      setRates(data);
    } catch {
      setRates({ toKRW: { KRW: 1, USD: 1370, JPY: 9.2 }, updated_at: new Date().toISOString(), fallback: true });
    }
  };

  const fetchMembers = async () => {
    if (!groupId) return;
    const { data: memberData } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    if (!memberData) return;
    const userIds = memberData.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_emoji")
      .in("user_id", userIds);
    setMembers(profiles || []);
  };

  const fetchExpenses = async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await supabase
      .from("group_expenses")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (data) {
      const userIds = [...new Set(data.map((e: any) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_emoji")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setExpenses(
        data.map((e: any) => ({
          ...e,
          user_name: profileMap.get(e.user_id)?.display_name || "멤버",
          user_emoji: profileMap.get(e.user_id)?.avatar_emoji || "😊",
        }))
      );
    }
    setLoading(false);
  };

  const handleAddExpense = async () => {
    if (!user || !groupId || !amount || Number(amount) <= 0) {
      toast({ title: "금액을 입력해주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("group_expenses").insert({
      group_id: groupId,
      user_id: user.id,
      amount: Number(amount),
      currency,
      description: description || "경비",
      category,
    });
    if (error) {
      toast({ title: "등록 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "경비가 등록되었습니다" });
      setAmount("");
      setDescription("");
      fetchExpenses();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("group_expenses").delete().eq("id", id);
    toast({ title: "삭제되었습니다" });
    fetchExpenses();
  };

  // Filtered expenses by date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.created_at);
      if (dateFrom && d < new Date(dateFrom.setHours(0, 0, 0, 0))) return false;
      if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  const toKRW = (amount: number, curr: string) => {
    if (!rates) return amount;
    return amount * (rates.toKRW[curr as keyof typeof rates.toKRW] || 1);
  };

  const formatCurrency = (amount: number, curr: string) => {
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    if (curr === "KRW") return `${symbol}${Math.round(amount).toLocaleString()}`;
    if (curr === "JPY") return `${symbol}${Math.round(amount).toLocaleString()}`;
    return `${symbol}${amount.toFixed(2)}`;
  };

  // Settlement calculation
  const settlement = useMemo(() => {
    if (!members.length || !filteredExpenses.length || !rates) return [];

    const memberCount = members.length;
    const totalPerPerson: Record<string, number> = {};
    members.forEach((m) => (totalPerPerson[m.user_id] = 0));

    let grandTotal = 0;
    filteredExpenses.forEach((e) => {
      const krw = toKRW(e.amount, e.currency);
      grandTotal += krw;
      if (totalPerPerson[e.user_id] !== undefined) {
        totalPerPerson[e.user_id] += krw;
      }
    });

    const fairShare = grandTotal / memberCount;
    const balances: { user_id: string; name: string; emoji: string; paid: number; owes: number }[] = [];
    members.forEach((m) => {
      balances.push({
        user_id: m.user_id,
        name: m.display_name || "멤버",
        emoji: m.avatar_emoji,
        paid: totalPerPerson[m.user_id] || 0,
        owes: (totalPerPerson[m.user_id] || 0) - fairShare,
      });
    });

    // Calculate transfers
    const debtors = balances.filter((b) => b.owes < 0).map((b) => ({ ...b, remaining: -b.owes }));
    const creditors = balances.filter((b) => b.owes > 0).map((b) => ({ ...b, remaining: b.owes }));
    const transfers: { from: string; fromEmoji: string; to: string; toEmoji: string; amount: number }[] = [];

    debtors.sort((a, b) => b.remaining - a.remaining);
    creditors.sort((a, b) => b.remaining - a.remaining);

    for (const debtor of debtors) {
      for (const creditor of creditors) {
        if (debtor.remaining <= 0 || creditor.remaining <= 0) continue;
        const transfer = Math.min(debtor.remaining, creditor.remaining);
        if (transfer > 1) {
          transfers.push({
            from: debtor.name,
            fromEmoji: debtor.emoji,
            to: creditor.name,
            toEmoji: creditor.emoji,
            amount: Math.round(transfer),
          });
        }
        debtor.remaining -= transfer;
        creditor.remaining -= transfer;
      }
    }

    return transfers;
  }, [filteredExpenses, members, rates]);

  // Stats
  const categoryStats = useMemo(() => {
    if (!filteredExpenses.length || !rates) return [];
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const krw = toKRW(e.amount, e.currency);
      map[e.category] = (map[e.category] || 0) + krw;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses, rates]);

  const memberStats = useMemo(() => {
    if (!filteredExpenses.length || !rates) return [];
    const map: Record<string, { name: string; value: number }> = {};
    filteredExpenses.forEach((e) => {
      const krw = toKRW(e.amount, e.currency);
      if (!map[e.user_id]) map[e.user_id] = { name: e.user_name || "멤버", value: 0 };
      map[e.user_id].value += krw;
    });
    return Object.values(map).map((v) => ({ ...v, value: Math.round(v.value) }));
  }, [filteredExpenses, rates]);

  const totalKRW = useMemo(() => {
    if (!rates) return 0;
    return Math.round(filteredExpenses.reduce((sum, e) => sum + toKRW(e.amount, e.currency), 0));
  }, [filteredExpenses, rates]);

  const chartConfig = {
    value: { label: "금액", color: "hsl(var(--primary))" },
  };

  if (!groupId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">그룹을 선택해주세요</p>
            <Button onClick={() => navigate("/friends")}>그룹 목록으로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">{groupName} 가계부</h1>
            {rates && (
              <p className="text-xs text-muted-foreground">
                환율: $1 = ₩{Math.round(rates.toKRW.USD).toLocaleString()} | ¥1 = ₩{rates.toKRW.JPY.toFixed(1)}
                {rates.fallback && " (기본값)"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Date Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "yy.MM.dd") : "시작일"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">~</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("text-xs gap-1", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "yy.MM.dd") : "종료일"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              <X className="h-3.5 w-3.5 mr-1" /> 초기화
            </Button>
          )}
        </div>

        {/* Total */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-sm text-muted-foreground">총 지출</p>
            <p className="text-2xl font-bold text-primary">₩{totalKRW.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{filteredExpenses.length}건의 경비</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="input" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input" className="text-xs gap-1">
              <Plus className="h-3.5 w-3.5" /> 입력
            </TabsTrigger>
            <TabsTrigger value="settle" className="text-xs gap-1">
              <Calculator className="h-3.5 w-3.5" /> 정산
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> 통계
            </TabsTrigger>
          </TabsList>

          {/* Input Tab */}
          <TabsContent value="input" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">경비 입력</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">₩ 원</SelectItem>
                      <SelectItem value="USD">$ 달러</SelectItem>
                      <SelectItem value="JPY">¥ 엔</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="금액"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Input
                  placeholder="설명 (예: 점심식사)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {amount && Number(amount) > 0 && currency !== "KRW" && rates && (
                  <p className="text-xs text-muted-foreground text-right">
                    ≈ ₩{Math.round(toKRW(Number(amount), currency)).toLocaleString()}
                  </p>
                )}
                <Button onClick={handleAddExpense} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  경비 등록
                </Button>
              </CardContent>
            </Card>

            {/* Expense List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">{expenses.length === 0 ? "등록된 경비가 없습니다" : "해당 기간에 경비가 없습니다"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((expense, i) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card>
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg">{expense.user_emoji}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {expense.user_name} · {expense.category} · {new Date(expense.created_at).toLocaleDateString("ko-KR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                            {expense.currency !== "KRW" && (
                              <p className="text-xs text-muted-foreground">
                                ≈ ₩{Math.round(toKRW(expense.amount, expense.currency)).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {expense.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settlement Tab */}
          <TabsContent value="settle" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> 정산 결과
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExpenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">경비를 먼저 입력해주세요</p>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center pb-3 border-b border-border">
                      <p className="text-sm text-muted-foreground">1인당 부담 금액</p>
                      <p className="text-xl font-bold">
                        ₩{members.length ? Math.round(totalKRW / members.length).toLocaleString() : 0}
                      </p>
                    </div>

                    {/* Per-member summary */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">멤버별 지출</p>
                      {members.map((m) => {
                        const paid = Math.round(
                          filteredExpenses
                            .filter((e) => e.user_id === m.user_id)
                            .reduce((s, e) => s + toKRW(e.amount, e.currency), 0)
                        );
                        const fair = members.length ? Math.round(totalKRW / members.length) : 0;
                        const diff = paid - fair;
                        return (
                          <div key={m.user_id} className="flex items-center justify-between text-sm">
                            <span>{m.avatar_emoji} {m.display_name}</span>
                            <div className="text-right">
                              <span className="font-medium">₩{paid.toLocaleString()}</span>
                              <span className={`ml-2 text-xs ${diff >= 0 ? "text-green-600" : "text-red-500"}`}>
                                ({diff >= 0 ? "+" : ""}₩{diff.toLocaleString()})
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Transfer suggestions */}
                    {settlement.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border">
                        <p className="text-sm font-medium">송금 안내</p>
                        {settlement.map((t, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 text-sm"
                          >
                            <span>{t.fromEmoji} {t.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{t.toEmoji} {t.to}</span>
                            <span className="ml-auto font-bold text-primary">₩{t.amount.toLocaleString()}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    {settlement.length === 0 && filteredExpenses.length > 0 && (
                      <p className="text-sm text-center text-muted-foreground py-2">정산이 완료된 상태입니다 ✅</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            {filteredExpenses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">통계를 보려면 경비를 입력해주세요</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Category Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">카테고리별 지출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryStats.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Member Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">멤버별 지출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
                      <BarChart data={memberStats}>
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(v) => `₩${(v / 10000).toFixed(0)}만`} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Category breakdown list */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">카테고리 상세</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {categoryStats.map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span>{cat.name}</span>
                        </div>
                        <span className="font-medium">₩{cat.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpensePage;
