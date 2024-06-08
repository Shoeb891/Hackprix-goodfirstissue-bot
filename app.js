import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";
import { TwitterApi } from "twitter-api-v2";

dotenv.config();

const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
        secret: webhookSecret,
    },
});

async function handleIssueLabeled({ octokit, payload }) {
    const issue = payload.issue;
    const label = payload.label;
    const repo = payload.repository;

    if (label.name.toLowerCase() === "good first issue") {
        console.log(`New "good first issue" labeled in ${repo.full_name} - Issue #${issue.number}`);

        const tweetText = `🔔 New Good First Issue in ${repo.full_name}!\n\n"${issue.title}"\n\nCheck it out: ${issue.html_url}`;

        try {

            const response = await twitterClient.v2.tweet(tweetText);
            console.log('Tweeted:', response.data);
        } catch (error) {
            console.error('Error tweeting:', error);
        }
    }
}

app.webhooks.on("issues.labeled", handleIssueLabeled);

app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
        console.error(`Error processing request: ${error.event}`);
    } else {
        console.error(error);
    }
});

const port = 3000;
const host = 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

const middleware = createNodeMiddleware(app.webhooks, { path });

http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`);
    console.log('Press Ctrl + C to quit.')
});
