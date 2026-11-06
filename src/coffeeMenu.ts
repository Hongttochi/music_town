export const coffeeMenu = [
  {
    id: 'americano',
    name: '아이스 아메리카노',
    shortName: '아아',
    detail: '시원하고 깔끔한 한 잔',
    color: '#69432c',
    iced: true,
  },
  {
    id: 'latte',
    name: '카페라떼',
    shortName: '카페라떼',
    detail: '우유를 더해 부드럽게',
    color: '#c69b70',
    iced: false,
  },
  {
    id: 'vanilla',
    name: '바닐라라떼',
    shortName: '바닐라라떼',
    detail: '달콤한 바닐라 향',
    color: '#dcc19a',
    iced: false,
  },
  {
    id: 'mocha',
    name: '카페모카',
    shortName: '카페모카',
    detail: '초콜릿과 커피의 만남',
    color: '#956446',
    iced: false,
  },
] as const;
export type CoffeeId = (typeof coffeeMenu)[number]['id'];
export const findCoffee = (id: CoffeeId) =>
  coffeeMenu.find((drink) => drink.id === id) ?? coffeeMenu[0];
