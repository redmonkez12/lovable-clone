﻿"use client";

import Link from "next/link";
import Image from "next/image";
import {SignedOut, SignUpButton, SignInButton, SignedIn} from "@clerk/nextjs";
import {Button} from "@/components/ui/button";
import {UserControl} from "@/components/user-controls";

export const Navbar = () => {
    return (
        <div
            className="p-4 bg-transparent fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b border-transparent">
            <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/logo.svg"
                        alt="Lovable clone"
                        width={24}
                        height={24}
                    />
                    <span className="font-semibold text-lg">Lovable Clone</span>
                </Link>

                <SignedOut>
                    <div className="flex gap-2">
                        <SignUpButton>
                            <Button size="sm" variant="outline">Sign Up</Button>
                        </SignUpButton>

                        <SignInButton>
                            <Button size="sm" variant="tertiary">Sign In</Button>
                        </SignInButton>
                    </div>
                </SignedOut>

                <SignedIn>
                    <UserControl/>
                </SignedIn>
            </div>
        </div>
    );
}
