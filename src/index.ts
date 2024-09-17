import { createPromise, deepClone } from "./utils";
import { computed, getCurrentInstance, ref, watch, watchEffect } from "vue";

/**
 * @param fetchFunc
 * @param options
 * @returns
 */
export const useAsyncData = <T, V = T, W = V, Y = W, INIT = T>(
  fetchFunc: () => Promise<T>,
  options?: {
    enhancer?: (data: T) => V;
    enhancer2?: (data: V) => W;
    enhancer3?: (data: W) => Y;
    init?: INIT;
    interval?: number;
  }
) => {
  const { enhancer, init, enhancer2, enhancer3, interval } = options || {};
  const getInitState = () => {
    if (typeof init === "object") return deepClone(init);
    return init;
  };
  const vueInstance = getCurrentInstance();
  const dataRef = ref<T>(getInitState() as any);
  const isLoading = ref(false);
  const hasInit = ref(false);
  const startUseIt = ref(!!vueInstance); // 如果是在组件里面默认开始就请求，否则是有使用才进行请求
  const computedData = computed<Y>(() => {
    startUseIt.value = true;
    let data = dataRef.value;
    if (enhancer) {
      // @ts-ignore
      data = enhancer(data);
    }
    if (enhancer2) {
      // @ts-ignore
      data = enhancer2(data);
    }
    if (enhancer3) {
      // @ts-ignore
      data = enhancer3(data);
    }
    // @ts-ignore
    return data as Y;
  });
  let curRequestTime = 0;
  const fetchData = async () => {
    if (!startUseIt.value) return;
    isLoading.value = true;
    const requestTime = curRequestTime + 1;
    curRequestTime = requestTime;
    try {
      let data = await fetchFunc();
      if (curRequestTime !== requestTime) return;
      if (!!data && !hasInit.value) {
        hasInit.value = true;
      }
      // @ts-ignore
      dataRef.value = data;
    } finally {
      isLoading.value = false;
    }
  };
  watchEffect(() => fetchData());
  const resetData = () => {
    dataRef.value = init as any;
  };
  if (interval) {
  }

  const isFirstLoading = computed(() => !hasInit.value && isLoading.value);

  let loadingPromise: ReturnType<typeof createPromise<void>> = createPromise();
  watch(isLoading, (isLoadingVal) => {
    if (isLoadingVal) {
      loadingPromise =
        loadingPromise.state !== "pending" ? createPromise() : loadingPromise;
    } else {
      loadingPromise?.resolve();
    }
  });

  const getRealTimeData = async () => {
    startUseIt.value = true;
    await loadingPromise?.instance;
    return computedData.value;
  };

  return {
    data: computedData,
    refresh: fetchData,
    isLoading: computed(() => isLoading.value), // 让loading状态变成只读
    resetData,
    getInitState,
    hasInit,
    isFirstLoading,
    getRealTimeData,
  };
};

export default useAsyncData;
