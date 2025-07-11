"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { LogoGoogle } from "@/components/icons";
import Image from "next/image";
import Logo from "./assets/logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await signIn("google");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Logo Section */}
              <div className="flex justify-center">
                <div className="size-20 bg-black rounded-full flex items-center justify-center shadow-lg">
                  <Image
                    src={Logo}
                    width={200}
                    height={200}
                    alt="logo"
                    className="rounded-full"
                  />
                </div>
              </div>

              {/* Heading */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  Welcome to Sched.Tech
                </h1>
                <p className="text-slate-600 text-sm">
                  Sign in to access your scheduling dashboard
                </p>
              </div>

              {/* Google Sign In Button */}
              <div className="pt-4">
                <Button
                  onClick={onClick}
                  variant="outline"
                  size="lg"
                  className="w-full h-12"
                >
                  <LogoGoogle />
                  Continue with Google
                </Button>
              </div>

              {/* Footer Text */}
              <div className="pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  By signing in, you agree to our{" "}
                  <Link href="#" className="text-slate-700 hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-slate-700 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            Need help?{" "}
            <a
              href="#"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
