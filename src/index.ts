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

  const editableData: Ref<Y> = ref(deepClone(getInitState() as any));

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

    // @ts-ignore
    return data as Y;
  });
  if (editableCopy) {
    watch(computedData, (val) => {
      editableData.value = deepClone(val);
    });
  }
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
      if (data !== undefined) {
        // @ts-ignore
        sourceData.value = data;
      }
    } finally {
      isLoading.value = false;
    }
  };
  watchEffect(() => fetchData());
  const resetData = () => {
    sourceData.value = init as any;
  };

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

  const computedHasInit = computed<boolean>(() => {
    startUseIt.value = true;
    return hasInit.value;
  });

  const computedEditableData = computed<Y>({
    get: () => {
      startUseIt.value = true;
      return editableData.value;
    },
    set: (val) => {
      editableData.value = val;
    },
  });

  const computedIsLoading = computed<boolean>(() => {
    startUseIt.value = true;
    return isLoading.value;
  });

  const isFirstLoading = computed<boolean>(() => {
    startUseIt.value = true;
    return !hasInit.value && isLoading.value;
  });

  return {
    data: computedData,
    editableData: computedEditableData,
    hasInit: computedHasInit,
    isLoading: computedIsLoading, // 让loading状态变成只读
    isFirstLoading,
    refresh: fetchData,
    resetData,
    getInitState,
    getRealTimeData,
  };
};
export default useAsyncData;
