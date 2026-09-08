const number = new Intl.NumberFormat('ko-KR');

export const money = (value?: number) => `${number.format(value ?? 0)}원`;
export const dateTime = (value?: string) => value ? new Date(value).toLocaleString('ko-KR') : '-';
