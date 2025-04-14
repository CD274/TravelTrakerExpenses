import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "@currency_rates";
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 horas

// Tasas de conversión de respaldo (deberías actualizarlas periódicamente)
const FALLBACK_RATES = {
  COP_BRL: 0.0012, // 1 COP = 0.0012 BRL
  BRL_COP: 833.33, // 1 BRL = 833.33 COP
  BRL_USD: 0.2, // 1 BRL = 0.2 USD
  USD_BRL: 5.0, // 1 USD = 5.0 BRL
  // Agrega más tasas según necesites
};

export const convertCurrency = async (from, to, amount) => {
  from = (from || "").toUpperCase().trim();
  to = (to || "").toUpperCase().trim();

  if (!from || !to) {
    console.error("Códigos de moneda inválidos");
    return 0;
  }
  // Validaciones básicas
  if (isNaN(amount) || amount === null || amount === undefined) {
    console.error("El monto debe ser un número válido.");
    return 0;
  }

  if (from === to) return parseFloat(amount.toFixed(2));

  // 1. Verificar en caché primero
  try {
    const cached = await AsyncStorage.getItem(`${CACHE_KEY}_${from}`);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRATION && rates && rates[to]) {
        return parseFloat((amount * rates[to]).toFixed(2));
      }
    }
  } catch (cacheError) {
    console.warn("Error al leer caché:", cacheError);
  }

  // 2. Intentar con API externa
  try {
    const API_KEY = "fe1f1f620204c8a107cb2292";
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/pair/${from}/${to}/${amount}`
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (data.result === "success" && data.conversion_result) {
      // Actualizar caché con las nuevas tasas
      const newRates = { [to]: data.conversion_rate };
      await AsyncStorage.setItem(
        `${CACHE_KEY}_${from}`,
        JSON.stringify({
          rates: newRates,
          timestamp: Date.now(),
        })
      );
      return parseFloat(data.conversion_result.toFixed(2));
    } else {
      throw new Error(data.error || "Invalid API response");
    }
  } catch (apiError) {
    console.warn("Error con API de conversión:", apiError);

    // 3. Usar tasas de respaldo
    const fallbackKey = `${from}_${to}`;
    if (FALLBACK_RATES[fallbackKey]) {
      console.warn(`Usando tasa de respaldo para ${fallbackKey}`);
      return parseFloat((amount * FALLBACK_RATES[fallbackKey]).toFixed(2));
    }

    console.error(`No se encontró tasa de conversión para ${from} a ${to}`);
    return parseFloat(amount.toFixed(2)); // Devuelve el monto original como último recurso
  }
};
