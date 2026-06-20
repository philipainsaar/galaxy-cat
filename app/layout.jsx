import './globals.css';

export const metadata = {
  title: '𝗔𝗟𝗠𝗢𝗦𝗧 𝗠𝗔𝗗𝗘 𝗜𝗡 𝗝𝗔𝗣𝗔𝗡',
  description: 'Place the alien cat into the boat.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
