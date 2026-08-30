"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  Input,
  Tabs,
  Tab,
} from "@heroui/react";
import { useAuth } from "@/context/AuthContext";
import { FiUser, FiLock } from "react-icons/fi";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode, login, register } =
    useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModeChange = (key: React.Key) => {
    setAuthModalMode(key as "login" | "register");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (authModalMode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      if (authModalMode === "login") {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.message || "Failed to login");
        } else {
          setUsername("");
          setPassword("");
        }
      } else {
        const res = await register(username, password);
        if (!res.success) {
          setError(res.message || "Failed to register");
        } else {
          setUsername("");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      placement="center"
      backdrop="blur"
      size="md"
      classNames={{
        base: "bg-zinc-950 border border-zinc-800 text-foreground",
        header: "border-b border-zinc-800",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 text-center">
          <h2 className="text-xl font-bold">
            {authModalMode === "login" ? "Welcome Back" : "Create an Account"}
          </h2>
          <p className="text-xs text-zinc-400 font-normal">
            {authModalMode === "login"
              ? "Sign in to track your watch history across devices"
              : "Register to save your watch history"}
          </p>
        </ModalHeader>
        <ModalBody className="py-6">
          <Tabs
            fullWidth
            size="md"
            selectedKey={authModalMode}
            onSelectionChange={handleModeChange}
            aria-label="Auth options"
            className="mb-4"
          >
            <Tab key="login" title="Login" />
            <Tab key="register" title="Register" />
          </Tabs>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-red-300 text-xs">
                {error}
              </div>
            )}

            <Input
              autoFocus
              label="Username"
              placeholder="Enter your username"
              value={username}
              onValueChange={setUsername}
              startContent={<FiUser className="text-zinc-400 text-lg" />}
              variant="bordered"
              isRequired
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onValueChange={setPassword}
              startContent={<FiLock className="text-zinc-400 text-lg" />}
              variant="bordered"
              isRequired
            />

            {authModalMode === "register" && (
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                type="password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                startContent={<FiLock className="text-zinc-400 text-lg" />}
                variant="bordered"
                isRequired
              />
            )}

            <Button
              type="submit"
              color="primary"
              variant="shadow"
              isLoading={isSubmitting}
              className="mt-2 font-semibold"
            >
              {authModalMode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
