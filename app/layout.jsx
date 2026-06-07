import './globals.css';

export const metadata = {
  title: 'Cosmic Voyage',
  description: 'Drag the alien cat into the cosmic boat.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
