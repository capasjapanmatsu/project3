import { lineClient } from './_lineClient';

/**
 * Push a plain text message to a specific user
 */
export async function pushText(to: string, text: string) {
  await lineClient.pushMessage(to, { type: 'text', text });
}

/**
 * Push a reservation notification (template placeholder)
 * You can replace this with a Flex Message later
 */
export async function pushReservation(to: string, payload: {
  parkName: string;
  date: string;          // e.g. 2025-08-09
  time: string;          // e.g. 10:00 - 12:00
  dogs?: string[];       // dog names
}) {
  const { parkName, date, time, dogs } = payload;
  const dogsText = dogs && dogs.length > 0 ? `\nワンちゃん: ${dogs.join('、')}` : '';
  const text = `ご予約が確定しました。\n施設: ${parkName}\n日時: ${date} ${time}${dogsText}`;
  await pushText(to, text);
}

export async function pushAlert(to: string, title: string, message: string) {
  await lineClient.pushMessage(to, [
    { type: 'text', text: `【${title}】` },
    { type: 'text', text: message },
  ] as any);
}


