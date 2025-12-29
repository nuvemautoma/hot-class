import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: "admin" | "user";
}

interface Group {
  id: string;
  name: string;
  link: string;
  description: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  target_user_id: string | null;
  created_at: string;
}

interface AdminLog {
  id: string;
  action: string;
  admin_name: string;
  admin_email: string;
  details: unknown;
  created_at: string;
}

interface IPCount {
  user_id: string;
  count: number;
}

const Admin = () => {
  const { user, profile, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState("accounts");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userIPCounts, setUserIPCounts] = useState<IPCount[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Form states
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newGroup, setNewGroup] = useState({ name: "", link: "", description: "" });
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [newNotification, setNewNotification] = useState({ title: "", message: "", targetUserId: "" });
  const [newAccount, setNewAccount] = useState({ name: "", email: "", password: "" });
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", password: "" });

  // Dialogs
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [createNotificationOpen, setCreateNotificationOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchUserRoles(),
      fetchGroups(),
      fetchNotifications(),
      fetchLogs(),
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) {
      setUsers(data);
      // Fetch IP counts for each user
      const counts: IPCount[] = [];
      for (const u of data) {
        const { count } = await supabase
          .from("authorized_ips")
          .select("*", { count: "exact", head: true })
          .eq("user_id", u.user_id);
        counts.push({ user_id: u.user_id, count: count || 0 });
      }
      setUserIPCounts(counts);
    }
  };

  const fetchUserRoles = async () => {
    const { data, error } = await supabase.from("user_roles").select("user_id, role");
    if (!error && data) setUserRoles(data as UserRole[]);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (!error && data) setGroups(data);
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    if (!error && data) setNotifications(data);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false });
    if (!error && data) setLogs(data);
  };

  const logAction = async (action: string, details?: Record<string, unknown>) => {
    if (!user || !profile) return;
    await supabase.from("admin_logs").insert([{
      action,
      admin_id: user.id,
      admin_name: profile.name,
      admin_email: profile.email,
      details: details as unknown,
    }]);
    fetchLogs();
  };

  const getUserRole = (userId: string): string => {
    const ownerEmail = "hotclass@dono.com";
    const userProfile = users.find((u) => u.user_id === userId);
    if (userProfile?.email === ownerEmail) return "Dono";
    const role = userRoles.find((r) => r.user_id === userId);
    return role?.role === "admin" ? "Admin" : "Usuário";
  };

  const getIPCount = (userId: string): number => {
    return userIPCounts.find((c) => c.user_id === userId)?.count || 0;
  };

  // Account Management
  const handleCreateAccount = async () => {
    if (!newAccount.email || !newAccount.password) {
      toast.error("E-mail e senha são obrigatórios");
      return;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: newAccount.email,
      password: newAccount.password,
      email_confirm: true,
      user_metadata: { name: newAccount.name },
    });

    if (error) {
      toast.error("Erro ao criar conta: " + error.message);
      return;
    }

    await logAction("Criou conta", { email: newAccount.email, name: newAccount.name });
    toast.success("Conta criada com sucesso!");
    setNewAccount({ name: "", email: "", password: "" });
    setCreateAccountOpen(false);
    fetchUsers();
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    const updates: Record<string, string> = {};
    if (editUserForm.name && editUserForm.name !== editingUser.name) {
      updates.name = editUserForm.name;
    }
    if (editUserForm.email && editUserForm.email !== editingUser.email) {
      updates.email = editUserForm.email;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", editingUser.user_id);

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return;
      }
    }

    if (editUserForm.password) {
      const { error } = await supabase.auth.admin.updateUserById(editingUser.user_id, {
        password: editUserForm.password,
      });
      if (error) {
        toast.error("Erro ao alterar senha: " + error.message);
        return;
      }
    }

    await logAction("Editou conta", { 
      email: editingUser.email, 
      changes: updates,
      passwordChanged: !!editUserForm.password 
    });
    toast.success("Conta atualizada!");
    setEditAccountOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async (userProfile: UserProfile) => {
    if (userProfile.email === "hotclass@dono.com") {
      toast.error("Não é possível excluir o dono");
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja excluir a conta de ${userProfile.email}?`);
    if (!confirmed) return;

    const { error } = await supabase.auth.admin.deleteUser(userProfile.user_id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }

    await logAction("Excluiu conta", { email: userProfile.email });
    toast.success("Conta excluída!");
    fetchUsers();
  };

  // Admin Management
  const handleAddAdmin = async () => {
    if (!newAdminEmail) {
      toast.error("Informe o e-mail");
      return;
    }

    const userProfile = users.find((u) => u.email === newAdminEmail);
    if (!userProfile) {
      toast.error("Usuário não encontrado");
      return;
    }

    if (userProfile.email === "hotclass@dono.com") {
      toast.error("O dono já possui todos os privilégios");
      return;
    }

    const existingRole = userRoles.find((r) => r.user_id === userProfile.user_id);
    if (existingRole?.role === "admin") {
      toast.error("Este usuário já é admin");
      return;
    }

    const { error } = await supabase.from("user_roles").upsert({
      user_id: userProfile.user_id,
      role: "admin",
    });

    if (error) {
      toast.error("Erro ao adicionar admin: " + error.message);
      return;
    }

    await logAction("Adicionou admin", { email: newAdminEmail });
    toast.success("Admin adicionado!");
    setNewAdminEmail("");
    fetchUserRoles();
  };

  const handleRemoveAdmin = async (userId: string) => {
    const userProfile = users.find((u) => u.user_id === userId);
    if (!userProfile) return;

    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (error) {
      toast.error("Erro ao remover admin: " + error.message);
      return;
    }

    await logAction("Removeu admin", { email: userProfile.email });
    toast.success("Admin removido!");
    fetchUserRoles();
  };

  // Group Management
  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.link) {
      toast.error("Nome e link são obrigatórios");
      return;
    }

    const { error } = await supabase.from("groups").insert({
      name: newGroup.name,
      link: newGroup.link,
      description: newGroup.description || null,
    });

    if (error) {
      toast.error("Erro ao criar grupo: " + error.message);
      return;
    }

    await logAction("Criou grupo", { name: newGroup.name });
    toast.success("Grupo criado!");
    setNewGroup({ name: "", link: "", description: "" });
    setCreateGroupOpen(false);
    fetchGroups();
  };

  const handleEditGroup = async () => {
    if (!editingGroup) return;

    const { error } = await supabase.from("groups").update({
      name: editingGroup.name,
      link: editingGroup.link,
      description: editingGroup.description,
    }).eq("id", editingGroup.id);

    if (error) {
      toast.error("Erro ao editar grupo: " + error.message);
      return;
    }

    await logAction("Editou grupo", { name: editingGroup.name });
    toast.success("Grupo atualizado!");
    setEditGroupOpen(false);
    setEditingGroup(null);
    fetchGroups();
  };

  const handleDeleteGroup = async (group: Group) => {
    const confirmed = window.confirm(`Excluir o grupo "${group.name}"?`);
    if (!confirmed) return;

    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) {
      toast.error("Erro ao excluir grupo: " + error.message);
      return;
    }

    await logAction("Excluiu grupo", { name: group.name });
    toast.success("Grupo excluído!");
    fetchGroups();
  };

  // Notifications
  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast.error("Título e mensagem são obrigatórios");
      return;
    }

    const { error } = await supabase.from("notifications").insert({
      title: newNotification.title,
      message: newNotification.message,
      target_user_id: newNotification.targetUserId || null,
      created_by: user?.id,
    });

    if (error) {
      toast.error("Erro ao enviar notificação: " + error.message);
      return;
    }

    await logAction("Enviou notificação", { 
      title: newNotification.title, 
      target: newNotification.targetUserId || "Todos" 
    });
    toast.success("Notificação enviada!");
    setNewNotification({ title: "", message: "", targetUserId: "" });
    setCreateNotificationOpen(false);
    fetchNotifications();
  };

  const handleDeleteNotification = async (notification: Notification) => {
    const { error } = await supabase.from("notifications").delete().eq("id", notification.id);
    if (error) {
      toast.error("Erro ao excluir notificação: " + error.message);
      return;
    }
    toast.success("Notificação excluída!");
    fetchNotifications();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const admins = users.filter((u) => {
    const role = userRoles.find((r) => r.user_id === u.user_id);
    return role?.role === "admin" && u.email !== "hotclass@dono.com";
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando painel admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <Icon name="arrow_back" size={20} className="text-muted-foreground" />
            </a>
            <div>
              <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Gerenciamento completo</p>
            </div>
          </div>
          <Badge variant="default" className="bg-primary">
            <Icon name="verified" size={14} className="mr-1" />
            Dono
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="accounts" className="flex items-center gap-1.5 text-xs">
              <Icon name="group" size={16} />
              <span className="hidden sm:inline">Contas</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-1.5 text-xs">
              <Icon name="shield" size={16} />
              <span className="hidden sm:inline">Admins</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-1.5 text-xs">
              <Icon name="groups" size={16} />
              <span className="hidden sm:inline">Grupos</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
              <Icon name="notifications" size={16} />
              <span className="hidden sm:inline">Avisos</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs">
              <Icon name="history" size={16} />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Gerenciamento de Contas</CardTitle>
                <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Icon name="add" size={16} className="mr-1" />
                      Criar Conta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Conta</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={newAccount.name}
                          onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                          placeholder="Nome do usuário"
                        />
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          value={newAccount.email}
                          onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div>
                        <Label>Senha</Label>
                        <Input
                          type="password"
                          value={newAccount.password}
                          onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                          placeholder="Senha inicial"
                        />
                      </div>
                      <Button onClick={handleCreateAccount} className="w-full">
                        Criar Conta
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredUsers.map((userProfile) => (
                      <div
                        key={userProfile.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{userProfile.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getUserRole(userProfile.user_id) === "Dono" ? "default" : getUserRole(userProfile.user_id) === "Admin" ? "secondary" : "outline"} className="text-[10px]">
                              {getUserRole(userProfile.user_id)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              IPs: {getIPCount(userProfile.user_id)}
                            </span>
                          </div>
                        </div>
                        {userProfile.email !== "hotclass@dono.com" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingUser(userProfile);
                                setEditUserForm({ name: userProfile.name, email: userProfile.email, password: "" });
                                setEditAccountOpen(true);
                              }}
                            >
                              <Icon name="edit" size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(userProfile)}
                              className="text-destructive"
                            >
                              <Icon name="delete" size={16} />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Edit Account Dialog */}
            <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nova Senha (deixe vazio para manter)</Label>
                    <Input
                      type="password"
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                      placeholder="Nova senha"
                    />
                  </div>
                  <Button onClick={handleEditUser} className="w-full">
                    Salvar Alterações
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Admins Tab */}
          <TabsContent value="admins">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gerenciamento de Administradores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="E-mail do novo admin..."
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddAdmin}>
                    <Icon name="add" size={16} className="mr-1" />
                    Adicionar
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-3">Admins Atuais</h4>
                  {admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum admin cadastrado</p>
                  ) : (
                    <div className="space-y-2">
                      {admins.map((admin) => (
                        <div
                          key={admin.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border"
                        >
                          <div>
                            <p className="font-medium text-sm">{admin.name}</p>
                            <p className="text-xs text-muted-foreground">{admin.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdmin(admin.user_id)}
                            className="text-destructive"
                          >
                            <Icon name="remove" size={16} className="mr-1" />
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Gerenciamento de Grupos</CardTitle>
                <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Icon name="add" size={16} className="mr-1" />
                      Criar Grupo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Novo Grupo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do Grupo</Label>
                        <Input
                          value={newGroup.name}
                          onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                          placeholder="Ex: Grupo Premium"
                        />
                      </div>
                      <div>
                        <Label>Link (WhatsApp/Telegram)</Label>
                        <Input
                          value={newGroup.link}
                          onChange={(e) => setNewGroup({ ...newGroup, link: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={newGroup.description}
                          onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                          placeholder="Descrição do grupo..."
                        />
                      </div>
                      <Button onClick={handleCreateGroup} className="w-full">
                        Criar Grupo
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum grupo cadastrado</p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{group.link}</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingGroup(group);
                              setEditGroupOpen(true);
                            }}
                          >
                            <Icon name="edit" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteGroup(group)}
                            className="text-destructive"
                          >
                            <Icon name="delete" size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Group Dialog */}
            <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Grupo</DialogTitle>
                </DialogHeader>
                {editingGroup && (
                  <div className="space-y-4">
                    <div>
                      <Label>Nome do Grupo</Label>
                      <Input
                        value={editingGroup.name}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Link</Label>
                      <Input
                        value={editingGroup.link}
                        onChange={(e) => setEditingGroup({ ...editingGroup, link: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={editingGroup.description || ""}
                        onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleEditGroup} className="w-full">
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Notificações</CardTitle>
                <Dialog open={createNotificationOpen} onOpenChange={setCreateNotificationOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Icon name="add" size={16} className="mr-1" />
                      Nova Notificação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar Notificação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Título</Label>
                        <Input
                          value={newNotification.title}
                          onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                          placeholder="Título da notificação"
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={newNotification.message}
                          onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                          placeholder="Mensagem..."
                        />
                      </div>
                      <div>
                        <Label>Destinatário (deixe vazio para todos)</Label>
                        <select
                          value={newNotification.targetUserId}
                          onChange={(e) => setNewNotification({ ...newNotification, targetUserId: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="">Todos os usuários</option>
                          {users.map((u) => (
                            <option key={u.user_id} value={u.user_id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={handleSendNotification} className="w-full">
                        Enviar Notificação
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="flex items-start justify-between p-3 rounded-lg border border-border"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">
                                {notification.target_user_id
                                  ? users.find((u) => u.user_id === notification.target_user_id)?.email || "Usuário específico"
                                  : "Todos"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNotification(notification)}
                            className="text-destructive"
                          >
                            <Icon name="delete" size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logs do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum log registrado</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{log.action}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Por: {log.admin_name} ({log.admin_email})
                          </p>
                          {log.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Detalhes: {JSON.stringify(log.details)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;