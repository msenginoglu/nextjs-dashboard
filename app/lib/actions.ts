"use server";

import { z } from "zod";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Lütfen bir müşteri seçin.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Lütfen $0'dan büyük bir tutar girin." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Lütfen bir fatura durumu seçin.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  // Form alanlarını Zod ile doğrulama
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  // Eğer doğrulama başarısız olursa, hataları döndür
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Eksik Alanlar. Fatura Oluşturulamadı.",
    };
  }
  // Veritabanına eklemek için verileri hazırlama
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];
  // Verileri veritabanına ekleme
  try {
    await sql`
  INSERT INTO invoices (customer_id, amount, status, date)
  VALUES ( ${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  } catch (error) {
    // Veritabanı hatası olursa özel bir mesaj döndür
    return {
      message: "Veritabanı Hatası: Fatura Oluşturulamadı.",
    };
  }
  // İşlem başarılı: sayfayı yenile ve yönlendir
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });
  const amountInCents = amount * 100;
  try {
    await sql`
  UPDATE invoices
  SET customer_id = ${customerId}, amount = ${amountInCents},
 status = ${status}
  WHERE id = ${id}
  `;
  } catch (error) {
    // Hatayı şimdilik yine konsola yazdırıyoruz
    console.error(error);
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath("/dashboard/invoices");
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
