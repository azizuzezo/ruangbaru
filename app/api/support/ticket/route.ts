import { NextRequest, NextResponse } from 'next/server';
import { sendTicketEmail, resend } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, question } = body;

    if (!name || !email || !question) {
      return NextResponse.json(
        { error: 'Nama, email, dan pertanyaan wajib diisi.' },
        { status: 400 }
      );
    }

    console.log('[support/ticket] Ticket request received:', { name, email, company, question });

    if (!resend) {
      console.warn('[support/ticket] Resend is not configured. Logging ticket instead of sending email.');
      return NextResponse.json({
        success: true,
        message: 'Tiket berhasil disimpan (Resend belum dikonfigurasi).',
        mocked: true,
      });
    }

    await sendTicketEmail({
      name,
      email,
      company: company || undefined,
      question,
    });

    return NextResponse.json({
      success: true,
      message: 'Tiket berhasil dikirim ke halo@ruangbaru.my.id.',
    });
  } catch (error: any) {
    console.error('[support/ticket] Error processing ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengirim tiket.' },
      { status: 500 }
    );
  }
}
