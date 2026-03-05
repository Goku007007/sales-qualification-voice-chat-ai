-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('SAAS', 'REAL_ESTATE', 'HEALTHCARE', 'ECOMMERCE', 'CONSULTING');

-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM ('CONSENT', 'OPENING', 'QUALIFY_LOOP', 'SCORE', 'ROUTE', 'ACTIONS', 'FOLLOWUP_SCHEDULED', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "ScoreLabel" AS ENUM ('COLD', 'WARM', 'HOT');

-- CreateEnum
CREATE TYPE "RouteDecision" AS ENUM ('HOT', 'WARM', 'COLD', 'RISK');

-- CreateEnum
CREATE TYPE "SessionOutcome" AS ENUM ('MEETING_BOOKED', 'NURTURE', 'HANDOFF', 'DECLINED', 'ABANDONED', 'ERROR');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('STAKEHOLDER_INVITE', 'RISK_REVIEW', 'HANDOFF', 'FOLLOWUP');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('CREATED', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "currentState" "WorkflowState" NOT NULL DEFAULT 'CONSENT',
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "score" INTEGER,
    "scoreLabel" "ScoreLabel",
    "scoreReasons" TEXT[],
    "leadFields" JSONB NOT NULL DEFAULT '{}',
    "routeDecision" "RouteDecision",
    "outcome" "SessionOutcome",
    "durationMs" INTEGER,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "MessageSource" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'CREATED',
    "assignee" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "externalId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "status" TEXT NOT NULL DEFAULT 'created',
    "fields" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpJob" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "executeAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Session_industry_idx" ON "Session"("industry");

-- CreateIndex
CREATE INDEX "Session_currentState_idx" ON "Session"("currentState");

-- CreateIndex
CREATE INDEX "Session_createdAt_idx" ON "Session"("createdAt");

-- CreateIndex
CREATE INDEX "Session_scoreLabel_idx" ON "Session"("scoreLabel");

-- CreateIndex
CREATE INDEX "Message_sessionId_createdAt_idx" ON "Message"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_sessionId_createdAt_idx" ON "Event"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Ticket_sessionId_idx" ON "Ticket"("sessionId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "CRMRecord_sessionId_idx" ON "CRMRecord"("sessionId");

-- CreateIndex
CREATE INDEX "CRMRecord_externalId_idx" ON "CRMRecord"("externalId");

-- CreateIndex
CREATE INDEX "FollowUpJob_status_executeAt_idx" ON "FollowUpJob"("status", "executeAt");

-- CreateIndex
CREATE INDEX "FollowUpJob_sessionId_idx" ON "FollowUpJob"("sessionId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMRecord" ADD CONSTRAINT "CRMRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpJob" ADD CONSTRAINT "FollowUpJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
