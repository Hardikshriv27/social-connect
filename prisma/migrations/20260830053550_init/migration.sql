BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000),
    [passwordHash] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[ConnectedAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [platform] NVARCHAR(1000) NOT NULL,
    [platformUserId] NVARCHAR(1000) NOT NULL,
    [accessToken] NVARCHAR(max) NOT NULL,
    [refreshToken] NVARCHAR(max),
    [expiresAt] DATETIME2,
    [profileName] NVARCHAR(1000),
    [profilePicture] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ConnectedAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ConnectedAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ConnectedAccount_platform_platformUserId_key] UNIQUE NONCLUSTERED ([platform],[platformUserId])
);

-- CreateTable
CREATE TABLE [dbo].[FacebookAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [connectedAccountId] NVARCHAR(1000) NOT NULL,
    [pageId] NVARCHAR(1000),
    [pageName] NVARCHAR(1000),
    [pageAccessToken] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [FacebookAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [FacebookAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FacebookAccount_connectedAccountId_key] UNIQUE NONCLUSTERED ([connectedAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[InstagramAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [connectedAccountId] NVARCHAR(1000) NOT NULL,
    [instagramBusinessAccountId] NVARCHAR(1000),
    [username] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [InstagramAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [InstagramAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [InstagramAccount_connectedAccountId_key] UNIQUE NONCLUSTERED ([connectedAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[YoutubeAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [connectedAccountId] NVARCHAR(1000) NOT NULL,
    [channelId] NVARCHAR(1000),
    [channelTitle] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [YoutubeAccount_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [YoutubeAccount_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [YoutubeAccount_connectedAccountId_key] UNIQUE NONCLUSTERED ([connectedAccountId])
);

-- CreateTable
CREATE TABLE [dbo].[Post] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000),
    [content] NVARCHAR(max),
    [scheduledAt] DATETIME2,
    [publishedAt] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Post_status_df] DEFAULT 'DRAFT',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Post_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Post_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PostMedia] (
    [id] NVARCHAR(1000) NOT NULL,
    [postId] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(max) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [size] INT,
    [mimeType] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PostMedia_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PostMedia_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PlatformPublishingInfo] (
    [id] NVARCHAR(1000) NOT NULL,
    [postId] NVARCHAR(1000) NOT NULL,
    [connectedAccountId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PlatformPublishingInfo_status_df] DEFAULT 'PENDING',
    [externalPostId] NVARCHAR(1000),
    [errorMessage] NVARCHAR(max),
    [publishedAt] DATETIME2,
    [platformSpecificData] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PlatformPublishingInfo_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PlatformPublishingInfo_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ConnectedAccount_userId_idx] ON [dbo].[ConnectedAccount]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Post_userId_idx] ON [dbo].[Post]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PostMedia_postId_idx] ON [dbo].[PostMedia]([postId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PlatformPublishingInfo_postId_idx] ON [dbo].[PlatformPublishingInfo]([postId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PlatformPublishingInfo_connectedAccountId_idx] ON [dbo].[PlatformPublishingInfo]([connectedAccountId]);

-- AddForeignKey
ALTER TABLE [dbo].[ConnectedAccount] ADD CONSTRAINT [ConnectedAccount_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[FacebookAccount] ADD CONSTRAINT [FacebookAccount_connectedAccountId_fkey] FOREIGN KEY ([connectedAccountId]) REFERENCES [dbo].[ConnectedAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[InstagramAccount] ADD CONSTRAINT [InstagramAccount_connectedAccountId_fkey] FOREIGN KEY ([connectedAccountId]) REFERENCES [dbo].[ConnectedAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[YoutubeAccount] ADD CONSTRAINT [YoutubeAccount_connectedAccountId_fkey] FOREIGN KEY ([connectedAccountId]) REFERENCES [dbo].[ConnectedAccount]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Post] ADD CONSTRAINT [Post_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PostMedia] ADD CONSTRAINT [PostMedia_postId_fkey] FOREIGN KEY ([postId]) REFERENCES [dbo].[Post]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PlatformPublishingInfo] ADD CONSTRAINT [PlatformPublishingInfo_postId_fkey] FOREIGN KEY ([postId]) REFERENCES [dbo].[Post]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PlatformPublishingInfo] ADD CONSTRAINT [PlatformPublishingInfo_connectedAccountId_fkey] FOREIGN KEY ([connectedAccountId]) REFERENCES [dbo].[ConnectedAccount]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
