import './globals.css';

export const metadata = {
  title: '𝗔𝗹𝗺𝗼𝘀𝘁 𝗺𝗮𝗱𝗲 𝗶𝗻 𝗝𝗮𝗽𝗮𝗻',
  description: 'An alien cat has come to collect you for shopping.',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/favicon.gif',
        type: 'image/gif',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">


      <head>
        {/* Main loading popup cloud frame */}
        <link
          rel="preload"
          as="image"
          href="/images/ring-cloud-frame-wide.png"
          type="image/png"
          fetchPriority="high"
        />

        {/* Floating ring popup cloud frame */}
        <link
          rel="preload"
          as="image"
          href="/images/ring-cloud-frame.png"
          type="image/png"
          fetchPriority="high"
        />
      </head>

      <body>{children}</body>
    </html>
  );
}
