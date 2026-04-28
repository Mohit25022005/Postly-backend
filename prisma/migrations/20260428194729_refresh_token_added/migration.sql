-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "PlatformPost_post_id_idx" ON "PlatformPost"("post_id");

-- CreateIndex
CREATE INDEX "Post_user_id_status_idx" ON "Post"("user_id", "status");

-- CreateIndex
CREATE INDEX "SocialAccount_user_id_platform_idx" ON "SocialAccount"("user_id", "platform");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
