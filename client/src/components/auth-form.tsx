import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useApp } from "@/contexts/AppContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useApp();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const onLogin = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", data);
      onSuccess();
    } catch (error: any) {
      toast({
        title: t.auth.loginError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", data);
      onSuccess();
    } catch (error: any) {
      const message = error?.message?.includes("exists") 
        ? t.auth.usernameExists 
        : t.auth.registerError;
      toast({
        title: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>{mode === "login" ? t.auth.login : t.auth.register}</CardTitle>
        <CardDescription>
          {mode === "login" 
            ? t.landing.subtitle 
            : t.landing.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.username}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder={t.auth.usernamePlaceholder} 
                        data-testid="input-username"
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.password}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="password" 
                        placeholder={t.auth.passwordPlaceholder}
                        data-testid="input-password"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login-submit"
              >
                {isLoading ? t.auth.loggingIn : t.auth.loginButton}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.username}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder={t.auth.usernamePlaceholder}
                        data-testid="input-register-username"
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.auth.password}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="password" 
                        placeholder={t.auth.passwordPlaceholder}
                        data-testid="input-register-password"
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={registerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.auth.firstName}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder={t.auth.firstNamePlaceholder}
                          data-testid="input-register-firstname"
                          autoComplete="given-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.auth.lastName}</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder={t.auth.lastNamePlaceholder}
                          data-testid="input-register-lastname"
                          autoComplete="family-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-register-submit"
              >
                {isLoading ? t.auth.registering : t.auth.registerButton}
              </Button>
            </form>
          </Form>
        )}
        
        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            onClick={switchMode}
            className="text-sm text-primary underline-offset-4 hover:underline"
            data-testid="button-switch-auth-mode"
          >
            {mode === "login" ? t.auth.switchToRegister : t.auth.switchToLogin}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
