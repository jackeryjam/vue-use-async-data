import { createPromise, deepClone } from "./utils";
import {
  Ref,
  computed,
  getCurrentInstance,
  ref,
  watch,
  watchEffect,
} from "vue";

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
    editableCopy?: boolean;
    lazy?: boolean;
  }
) => {
  const {
    enhancer,
    init,
    enhancer2,
    enhancer3,
    editableCopy = false,
    lazy = true,
  } = options || {};
  const getInitState = () => {
    if (typeof init === "object") return deepClone(init);
    return init;
  };
  const vueInstance = getCurrentInstance();
  const sourceData = ref<T>(getInitState() as any);
  const isLoading = ref(false);
  const hasInit = ref(false);
  const startUseIt = ref(!!vueInstance || !lazy); // 如果是在组件里面默认开始就请求，否则是有使用才进行请求

  const editableData: Ref<Y> = ref();

  const computedData = computed<Y>(() => {
    startUseIt.value = true;
    let data = sourceData.value;
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

    if (editableCopy) {
      editableData.value = deepClone(data);
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
      sourceData.value = data;
    } finally {
      isLoading.value = false;
    }
  };
  watchEffect(() => fetchData());
  const resetData = () => {
    sourceData.value = init as any;
  };

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
    editableData,
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
