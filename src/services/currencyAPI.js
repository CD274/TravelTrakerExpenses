import AsyncStorage from "@react-native-async-storage/async-storage";
const CACHE_KEY = "@currency_rates";
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

export const convertCurrency = async (from, to, amount) => {
  if (isNaN(amount)) {
    console.error("El monto debe ser un numero.");
    return 0;
  }
  if (from === to) return amount;
  const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${from}`);
  if (cached) {
    const { rates, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRATION && rates[to]) {
      return Math.round(amount * data.rates[to] * 100) / 100;
    }
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${from}`
    );
    const data = await response.json();
    await AsyncStorage.setItem(
      `${CACHE_KEY}_${from}`,
      JSON.stringify({
        rates: data.rates,
        timestamp: Date.now(),
      })
    );
    return Math.round(amount * data.rates[to] * 100) / 100;
  } catch (error) {
    console.error("Error converting currency:", error);
    return amount;
  }
};
