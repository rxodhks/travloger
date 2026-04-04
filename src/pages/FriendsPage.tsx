import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Copy, Check, UserPlus, Loader2, ChevronRight, MapPin, BookOpen, Calendar, Trash2, LogOut, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface Group {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  memberCount?: number;
  members?: { user_id: string; display_name: string; avatar_emoji: string }[];
}

const FriendsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { limits } = usePremiumStatus();
  const { toast } = useToast();

  const fetchGroups = async () => {
    if (!user) return;
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: groupsData } = await supabase.from("groups").select("*").in("id", groupIds);

    if (groupsData) {
      const enriched = await Promise.all(
        groupsData.map(async (g) => {
          const { data: memberData, count } = await supabase
            .from("group_members")
            .select("user_id", { count: "exact" })
            .eq("group_id", g.id);

          let members: { user_id: string; display_name: string; avatar_emoji: string }[] = [];
          if (memberData && memberData.length > 0) {
            const userIds = memberData.map((m) => m.user_id);
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, display_name, avatar_emoji")
              .in("user_id", userIds);
            members = profiles || [];
          }
          return { ...g, memberCount: count ?? 0, members };
        })
      );
      setGroups(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, [user]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteGroup = async (group: Group) => {
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "그룹이 삭제되었습니다" });
      setSelectedGroup(null);
      fetchGroups();
    }
  };

  const handleLeaveGroup = async (group: Group) => {
    if (!user) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "탈퇴 실패", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "그룹에서 나왔습니다" });
      setSelectedGroup(null);
      fetchGroups();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group detail view
  if (selectedGroup) {
    const isOwner = selectedGroup.owner_id === user?.id;
    return (
      <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
        <div className="px-5 pt-12 pb-6">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
            >
              ← 그룹 목록
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{selectedGroup.name}</h1>
                <p className="text-sm text-muted-foreground">
                  멤버 {selectedGroup.memberCount}/{limits.maxGroupMembers}명{isOwner && " · 내가 만든 그룹"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Invite code */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="mb-6 border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">초대 코드</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold tracking-widest text-primary font-mono">{selectedGroup.invite_code}</span>
                  <button
                    onClick={() => copyCode(selectedGroup.invite_code, selectedGroup.id)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {copiedId === selectedGroup.id ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick actions */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-4 gap-3 mb-6">
            <button onClick={() => navigate("/map")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-xs text-foreground font-medium">체크인</span>
            </button>
            <button onClick={() => navigate("/create")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
              <BookOpen className="w-5 h-5 text-accent" />
              <span className="text-xs text-foreground font-medium">기록하기</span>
            </button>
            <button onClick={() => navigate("/trip-plan")} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-xs text-foreground font-medium">여행 계획</span>
            </button>
            <button onClick={() => navigate(`/expenses?groupId=${selectedGroup.id}&groupName=${encodeURIComponent(selectedGroup.name)}`)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors">
              <Receipt className="w-5 h-5 text-accent" />
              <span className="text-xs text-foreground font-medium">가계부</span>
            </button>
          </motion.div>

          {/* Members */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">멤버</h2>
            <div className="space-y-2">
              {selectedGroup.members?.map((member) => (
                <Card key={member.user_id} className="border-border/60">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">{member.avatar_emoji || "😊"}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.display_name || "멤버"}</p>
                      {member.user_id === selectedGroup.owner_id && <p className="text-xs text-primary">그룹장</p>}
                      {member.user_id === user?.id && member.user_id !== selectedGroup.owner_id && <p className="text-xs text-muted-foreground">나</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Delete / Leave */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-6">
            {isOwner ? (
              <Button
                variant="outline"
                onClick={() => handleDeleteGroup(selectedGroup)}
                className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                그룹 삭제
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => handleLeaveGroup(selectedGroup)}
                className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                그룹 나가기
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Group list view
  return (
    <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
      <div className="px-5 pt-12 pb-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">친구 그룹 👫</p>
              <h1 className="text-2xl font-bold text-foreground">내 그룹</h1>
            </div>
            <Button size="sm" onClick={() => navigate("/friend-setup")} className="rounded-xl gap-1">
              <Plus className="w-4 h-4" />
              새 그룹
            </Button>
          </div>
        </motion.div>

        {groups.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-4xl">👫</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">아직 그룹이 없어요</h3>
            <p className="text-sm text-muted-foreground mb-6">친구들과 함께할 그룹을 만들어보세요!</p>
            <Button onClick={() => navigate("/friend-setup")} className="rounded-xl">
              <UserPlus className="w-4 h-4 mr-2" />
              그룹 만들기
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, i) => (
              <motion.div key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card
                  className="border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedGroup(group)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          멤버 {group.memberCount}/{limits.maxGroupMembers}명{group.owner_id === user?.id && " · 내가 만든 그룹"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
