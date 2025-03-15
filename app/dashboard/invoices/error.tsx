"use client";
import { useEffect } from "react";
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hatayı konsola yazdırıyoruz
    console.error(error);
  }, [error]);
  return (
    <main className="flex h-full flex-col items-center justify-center">
      <h2 className="text-center">Bir şeyler yanlış gitti!</h2>
      <button
        className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-400"
        onClick={
          // Sayfayı yeniden yüklemeyi deneyelim
          () => reset()
        }
      >
        Tekrar dene
      </button>
    </main>
  );
}
