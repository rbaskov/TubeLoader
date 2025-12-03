import { useEffect, useState } from "react";
import { Loader2, Server, MessageCircle, Tv, Palette, CheckCircle2, XCircle, Plug, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { UserSettings } from "@shared/schema";
import type { Language } from "@/lib/i18n";

export default function Settings() {
  const { t, language, setLanguage, theme, setTheme } = useApp();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [synologyEndpoint, setSynologyEndpoint] = useState("");
  const [autoUploadToNas, setAutoUploadToNas] = useState(true);
  const [youtubeCookies, setYoutubeCookies] = useState("");

  // Proxy settings
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyType, setProxyType] = useState("http");
  const [proxyHost, setProxyHost] = useState("");
  const [proxyPort, setProxyPort] = useState("");
  const [proxyUsername, setProxyUsername] = useState("");
  const [proxyPassword, setProxyPassword] = useState("");

  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const [jellyfinServerUrl, setJellyfinServerUrl] = useState("");
  const [jellyfinApiKey, setJellyfinApiKey] = useState("");
  const [jellyfinLibraryId, setJellyfinLibraryId] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: t.errors.unauthorized,
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast, t.errors.unauthorized]);

  const { data: settings, isLoading: settingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settings) {
      setSynologyEndpoint(settings.synologyEndpoint || "");
      setAutoUploadToNas(settings.autoUploadToNas === 1 || settings.autoUploadToNas === null);
      setYoutubeCookies(settings.youtubeCookies || "");
      // Proxy settings
      setProxyEnabled(settings.proxyEnabled === 1);
      setProxyType(settings.proxyType || "http");
      setProxyHost(settings.proxyHost || "");
      setProxyPort(settings.proxyPort?.toString() || "");
      setProxyUsername(settings.proxyUsername || "");
      setProxyPassword(settings.proxyPassword || "");
      
      setTelegramBotToken(settings.telegramBotToken || "");
      setTelegramChatId(settings.telegramChatId || "");
      setJellyfinServerUrl(settings.jellyfinServerUrl || "");
      setJellyfinApiKey(settings.jellyfinApiKey || "");
      setJellyfinLibraryId(settings.jellyfinLibraryId || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: t.settings.saved,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t.settings.error,
        variant: "destructive",
      });
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async (data: { language: Language; theme: "light" | "dark" }) => {
      await apiRequest("PUT", "/api/preferences", data);
    },
    onSuccess: () => {
      toast({
        title: t.settings.saved,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t.settings.error,
        variant: "destructive",
      });
    },
  });

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const testSynologyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/settings/test-synology");
      return response.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast({
          title: t.settings.synology.connectionSuccess,
          description: data.details,
        });
      } else {
        toast({
          title: t.settings.synology.connectionFailed,
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: async (error: any) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t.errors.unauthorized,
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      let errorMessage = t.settings.synology.connectionFailed;
      let details = "";
      
      try {
        if (error.response) {
          const data = await error.response.json();
          errorMessage = data.message || errorMessage;
          details = data.details || "";
        }
      } catch {
        // Ignore parse errors
      }
      
      setTestResult({
        success: false,
        message: errorMessage,
        details,
      });
      
      toast({
        title: t.settings.synology.connectionFailed,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleTestSynology = () => {
    setTestResult(null);
    testSynologyMutation.mutate();
  };

  const handleSaveSynology = () => {
    saveMutation.mutate({
      synologyEndpoint,
      autoUploadToNas,
    });
  };

  const handleSaveYoutubeCookies = () => {
    saveMutation.mutate({
      youtubeCookies,
    });
  };

  const handleSaveProxy = () => {
    saveMutation.mutate({
      proxyEnabled,
      proxyType,
      proxyHost,
      proxyPort: proxyPort ? parseInt(proxyPort, 10) : null,
      proxyUsername: proxyUsername || null,
      proxyPassword: proxyPassword || null,
    });
  };

  const handleSaveTelegram = () => {
    saveMutation.mutate({
      telegramBotToken,
      telegramChatId,
    });
  };

  const handleSaveJellyfin = () => {
    saveMutation.mutate({
      jellyfinServerUrl,
      jellyfinApiKey,
      jellyfinLibraryId,
    });
  };

  const handleSavePreferences = () => {
    savePreferencesMutation.mutate({ language, theme });
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 
          className="text-2xl font-semibold mb-6"
          data-testid="text-page-title"
        >
          {t.settings.title}
        </h1>

        <Tabs defaultValue="synology" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="synology" data-testid="tab-synology">
              <Server className="h-4 w-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">{t.settings.tabs.synology}</span>
              <span className="sm:hidden">NAS</span>
            </TabsTrigger>
            <TabsTrigger value="proxy" data-testid="tab-proxy">
              <Globe className="h-4 w-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">{t.settings.proxy?.title || "Proxy"}</span>
              <span className="sm:hidden">Proxy</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" data-testid="tab-telegram">
              <MessageCircle className="h-4 w-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">{t.settings.tabs.telegram}</span>
              <span className="sm:hidden">TG</span>
            </TabsTrigger>
            <TabsTrigger value="jellyfin" data-testid="tab-jellyfin">
              <Tv className="h-4 w-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">{t.settings.tabs.jellyfin}</span>
              <span className="sm:hidden">JF</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">
              <Palette className="h-4 w-4 mr-2 hidden sm:block" />
              <span className="hidden sm:inline">{t.settings.tabs.preferences}</span>
              <span className="sm:hidden">UI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="synology">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.synology.title}</CardTitle>
                <CardDescription>{t.settings.synology.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="synology-endpoint">{t.settings.synology.endpoint}</Label>
                  <Input
                    id="synology-endpoint"
                    type="url"
                    placeholder={t.settings.synology.endpointPlaceholder}
                    value={synologyEndpoint}
                    onChange={(e) => setSynologyEndpoint(e.target.value)}
                    data-testid="input-synology-endpoint"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings.synology.endpointHint}
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-upload">{t.settings.synology.autoUpload}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t.settings.synology.autoUploadDescription}
                    </p>
                  </div>
                  <Switch
                    id="auto-upload"
                    checked={autoUploadToNas}
                    onCheckedChange={setAutoUploadToNas}
                    data-testid="switch-auto-upload"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleSaveSynology}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-synology"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.settings.saving}
                      </>
                    ) : (
                      t.settings.save
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleTestSynology}
                    disabled={testSynologyMutation.isPending || !settings?.synologyEndpoint}
                    data-testid="button-test-synology"
                  >
                    {testSynologyMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.settings.synology.testing}
                      </>
                    ) : (
                      <>
                        <Plug className="mr-2 h-4 w-4" />
                        {t.settings.synology.testConnection}
                      </>
                    )}
                  </Button>
                </div>

                {testResult && (
                  <div 
                    className={`mt-4 p-4 rounded-md flex items-start gap-3 ${
                      testResult.success 
                        ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" 
                        : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                    }`}
                    data-testid="synology-test-result"
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        testResult.success 
                          ? "text-green-800 dark:text-green-200" 
                          : "text-red-800 dark:text-red-200"
                      }`}>
                        {testResult.success 
                          ? t.settings.synology.connectionSuccess 
                          : t.settings.synology.connectionFailed}
                      </p>
                      {testResult.details && (
                        <p className={`text-sm mt-1 ${
                          testResult.success 
                            ? "text-green-700 dark:text-green-300" 
                            : "text-red-700 dark:text-red-300"
                        }`}>
                          {testResult.details}
                        </p>
                      )}
                      {!testResult.success && testResult.message && testResult.message !== t.settings.synology.connectionFailed && (
                        <p className="text-sm mt-1 text-red-700 dark:text-red-300">
                          {testResult.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{t.settings.youtube?.title || "YouTube Cookies"}</CardTitle>
                <CardDescription>{t.settings.youtube?.description || "Add YouTube cookies to download age-restricted or region-blocked videos"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-cookies">{t.settings.youtube?.cookies || "Cookies (Netscape format)"}</Label>
                  <Textarea
                    id="youtube-cookies"
                    placeholder={t.settings.youtube?.cookiesPlaceholder || "Paste cookies.txt content here..."}
                    value={youtubeCookies}
                    onChange={(e) => setYoutubeCookies(e.target.value)}
                    className="font-mono text-xs h-32"
                    data-testid="input-youtube-cookies"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings.youtube?.cookiesHint || "Export cookies from browser using extensions like 'Get cookies.txt LOCALLY' or 'cookies.txt'"}
                  </p>
                </div>
                <Button 
                  onClick={handleSaveYoutubeCookies}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-youtube-cookies"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxy">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.proxy?.title || "Proxy Server"}</CardTitle>
                <CardDescription>{t.settings.proxy?.description || "Use a proxy server to download videos from YouTube"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="proxy-enabled">{t.settings.proxy?.enabled || "Enable Proxy"}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t.settings.proxy?.enabledDescription || "Route YouTube downloads through proxy server"}
                    </p>
                  </div>
                  <Switch
                    id="proxy-enabled"
                    checked={proxyEnabled}
                    onCheckedChange={setProxyEnabled}
                    data-testid="switch-proxy-enabled"
                  />
                </div>
                
                {proxyEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="proxy-type">{t.settings.proxy?.type || "Proxy Type"}</Label>
                      <Select 
                        value={proxyType} 
                        onValueChange={setProxyType}
                      >
                        <SelectTrigger id="proxy-type" data-testid="select-proxy-type">
                          <SelectValue placeholder={t.settings.proxy?.typePlaceholder || "Select proxy type"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http" data-testid="option-proxy-http">
                            {t.settings.proxy?.types?.http || "HTTP"}
                          </SelectItem>
                          <SelectItem value="https" data-testid="option-proxy-https">
                            {t.settings.proxy?.types?.https || "HTTPS"}
                          </SelectItem>
                          <SelectItem value="socks4" data-testid="option-proxy-socks4">
                            {t.settings.proxy?.types?.socks4 || "SOCKS4"}
                          </SelectItem>
                          <SelectItem value="socks5" data-testid="option-proxy-socks5">
                            {t.settings.proxy?.types?.socks5 || "SOCKS5"}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="proxy-host">{t.settings.proxy?.host || "Host"}</Label>
                        <Input
                          id="proxy-host"
                          placeholder={t.settings.proxy?.hostPlaceholder || "proxy.example.com"}
                          value={proxyHost}
                          onChange={(e) => setProxyHost(e.target.value)}
                          data-testid="input-proxy-host"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proxy-port">{t.settings.proxy?.port || "Port"}</Label>
                        <Input
                          id="proxy-port"
                          type="number"
                          placeholder={t.settings.proxy?.portPlaceholder || "8080"}
                          value={proxyPort}
                          onChange={(e) => setProxyPort(e.target.value)}
                          data-testid="input-proxy-port"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.settings.proxy?.hostHint || "Enter proxy server hostname or IP address"}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proxy-username">{t.settings.proxy?.username || "Username (optional)"}</Label>
                        <Input
                          id="proxy-username"
                          placeholder={t.settings.proxy?.usernamePlaceholder || "Proxy username"}
                          value={proxyUsername}
                          onChange={(e) => setProxyUsername(e.target.value)}
                          data-testid="input-proxy-username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proxy-password">{t.settings.proxy?.password || "Password (optional)"}</Label>
                        <Input
                          id="proxy-password"
                          type="password"
                          placeholder={t.settings.proxy?.passwordPlaceholder || "Proxy password"}
                          value={proxyPassword}
                          onChange={(e) => setProxyPassword(e.target.value)}
                          data-testid="input-proxy-password"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <Button 
                  onClick={handleSaveProxy}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-proxy"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.telegram.title}</CardTitle>
                <CardDescription>{t.settings.telegram.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-token">{t.settings.telegram.botToken}</Label>
                  <Input
                    id="telegram-token"
                    type="password"
                    placeholder={t.settings.telegram.botTokenPlaceholder}
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    data-testid="input-telegram-token"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings.telegram.howToGetToken}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-chat-id">{t.settings.telegram.chatId}</Label>
                  <Input
                    id="telegram-chat-id"
                    placeholder={t.settings.telegram.chatIdPlaceholder}
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    data-testid="input-telegram-chat-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.settings.telegram.howToGetChatId}
                  </p>
                </div>
                <Button 
                  onClick={handleSaveTelegram}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-telegram"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jellyfin">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.jellyfin.title}</CardTitle>
                <CardDescription>{t.settings.jellyfin.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jellyfin-url">{t.settings.jellyfin.serverUrl}</Label>
                  <Input
                    id="jellyfin-url"
                    type="url"
                    placeholder={t.settings.jellyfin.serverUrlPlaceholder}
                    value={jellyfinServerUrl}
                    onChange={(e) => setJellyfinServerUrl(e.target.value)}
                    data-testid="input-jellyfin-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jellyfin-api-key">{t.settings.jellyfin.apiKey}</Label>
                  <Input
                    id="jellyfin-api-key"
                    type="password"
                    placeholder={t.settings.jellyfin.apiKeyPlaceholder}
                    value={jellyfinApiKey}
                    onChange={(e) => setJellyfinApiKey(e.target.value)}
                    data-testid="input-jellyfin-api-key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jellyfin-library-id">{t.settings.jellyfin.libraryId}</Label>
                  <Input
                    id="jellyfin-library-id"
                    placeholder={t.settings.jellyfin.libraryIdPlaceholder}
                    value={jellyfinLibraryId}
                    onChange={(e) => setJellyfinLibraryId(e.target.value)}
                    data-testid="input-jellyfin-library-id"
                  />
                </div>
                <Button 
                  onClick={handleSaveJellyfin}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-jellyfin"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.preferences.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">{t.settings.preferences.language}</Label>
                  <Select 
                    value={language} 
                    onValueChange={(value) => setLanguage(value as Language)}
                  >
                    <SelectTrigger id="language" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" data-testid="option-language-en">English</SelectItem>
                      <SelectItem value="ru" data-testid="option-language-ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">{t.settings.preferences.theme}</Label>
                  <Select 
                    value={theme} 
                    onValueChange={(value) => setTheme(value as "light" | "dark")}
                  >
                    <SelectTrigger id="theme" data-testid="select-theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light" data-testid="option-theme-light">
                        {t.settings.preferences.themeLight}
                      </SelectItem>
                      <SelectItem value="dark" data-testid="option-theme-dark">
                        {t.settings.preferences.themeDark}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSavePreferences}
                  disabled={savePreferencesMutation.isPending}
                  data-testid="button-save-preferences"
                >
                  {savePreferencesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.settings.saving}
                    </>
                  ) : (
                    t.settings.save
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
