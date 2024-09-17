export const createPromise = <T = void>() => {
  type IPromiseParam = T | PromiseLike<T>;
  let resolve: (value: IPromiseParam) => void;
  let reject: (reason?: any) => void;
  let state: "pending" | "resolve" | "reject" = "pending";
  const instance = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    instance,
    resolve: (value: IPromiseParam) => {
      state = "resolve";
      resolve(value);
    },
    reject: (reason?: any) => {
      state = "reject";
      reject(reason);
    },
    get state() {
      return state;
    },
  };
};

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    // 如果是原始值或者 null，则直接返回
    return obj;
  }

  if (Array.isArray(obj)) {
    // 如果是数组，则遍历每个元素并递归克隆
    return obj.map((item) => deepClone(item)) as any;
  }

  if (typeof obj === "function") {
    // 如果是函数，则直接返回
    return obj;
  }

  // 如果是对象，则遍历每个属性并递归克隆
  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj as T;
}
