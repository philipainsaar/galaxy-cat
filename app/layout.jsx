import './globals.css';

export const metadata = {
  title: '𝗔𝗹𝗺𝗼𝘀𝘁 𝗺𝗮𝗱𝗲 𝗶𝗻 𝗝𝗮𝗽𝗮𝗻',
  description: 'Place the alien cat into the boat.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
