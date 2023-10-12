import { useEffect, useState } from "react";
import { Button } from "./Button";
import { type Message, ChatLine, LoadingChatLine } from "./ChatLine";
import { useCookies } from "react-cookie";
import { Auth } from "aws-amplify";
import axios from "axios";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";

const COOKIE_NAME = "nextjs-example-ai-chat-gpt3";

const InputMessage = ({ input, setInput, sendMessage }: any) => (
  <div className="mt-6 flex clear-both">
    <input
      type="text"
      aria-label="chat input"
      required
      className="min-w-0 flex-auto appearance-none rounded-md border border-zinc-900/10 bg-white px-3 py-[calc(theme(spacing.2)-1px)] shadow-md shadow-zinc-800/5 placeholder:text-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 sm:text-sm"
      value={input}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          sendMessage(input);
          setInput("");
        }
      }}
      onChange={(e) => {
        setInput(e.target.value);
      }}
    />
    <Button
      type="submit"
      className="ml-4 flex-none"
      onClick={() => {
        sendMessage(input);
        setInput("");
      }}
    >
      Say
    </Button>
  </div>
);

export function Chat(user: any) {
  const initialMessage: Message[] = [
    {
      who: "bot",
      message: `Hi ${
        user?.attributes?.given_name ?? "User"
      }! How can I help you today?`,
    },
  ];
  const [messages, setMessages] = useState<Message[]>(initialMessage);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cookie, setCookie] = useCookies([COOKIE_NAME]);

  useEffect(() => {
    if (!cookie[COOKIE_NAME]) {
      // generate a semi random short id
      const randomId = Math.random().toString(36).substring(7);
      setCookie(COOKIE_NAME, randomId);
    }
  }, [cookie, setCookie]);

  const sendMessage = async (message: string) => {
    setLoading(true);
    const newMessages = [
      ...messages,
      { message: message, who: "user" } as Message,
    ];
    setMessages(newMessages);
    const lastTenMessages = newMessages.slice(-10);

    const essentialCredentials = Auth.essentialCredentials(
      await Auth.currentCredentials()
    );

    const url = process.env.NEXT_PUBLIC_LAMBDA_URL as string;
    const functionUrl = new URL(url);

    const sigv4 = new SignatureV4({
      service: "lambda",
      region: process.env.NEXT_PUBLIC_AWS_REGION as string,
      credentials: {
        accessKeyId: essentialCredentials.accessKeyId,
        secretAccessKey: essentialCredentials.secretAccessKey,
        sessionToken: essentialCredentials.sessionToken,
      },
      sha256: Sha256,
    });

    const lastMessage = lastTenMessages.slice(-1)[0].message;

    // sign the request
    const signed = await sigv4.sign({
      method: "POST",
      hostname: functionUrl.host,
      path: functionUrl.pathname,
      protocol: functionUrl.protocol,
      headers: {
        "Content-Type": "application/json",
        host: functionUrl.hostname,
      },
      body: JSON.stringify({
        messages: lastMessage,
        user: user,
        userId: user?.attributes?.sub ?? cookie[COOKIE_NAME],
      }),
    });

    delete signed.headers["host"];

    try {
      const response = await axios.post(url, signed.body, {
        headers: signed.headers,
      });

      const data = await response.data;

      setMessages([...newMessages, { message: data, who: "bot" } as Message]);
    } catch (error) {
      console.log(error);
      throw error;
    }

    setLoading(false);
  };

  return (
    <div className="rounded-2xl border-zinc-100  lg:border lg:p-6">
      {messages &&
        messages.map(({ message, who }, index) => (
          <ChatLine key={index} who={who} message={message} />
        ))}

      {loading && <LoadingChatLine />}

      {messages.length < 2 && (
        <span className="mx-auto flex flex-grow text-gray-600 clear-both">
          Type a message to start the conversation
        </span>
      )}
      <InputMessage
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
      />
    </div>
  );
}
