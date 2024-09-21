import { useAsyncData } from "../src";
import { deepClone } from "../src/utils";

const nextTimeTick = () => new Promise((res) => setTimeout(res));

const fetchData = <T>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(deepClone(data));
    }, delay);
  });
};
describe("useAsyncData: integration tests", () => {
  const _userInfo = { userId: 1, mobile: 1233774394, userName: "A" };

  test("editableData ", async () => {
    const {
      data: userInfo,
      editableData: editableUserData,
      getRealTimeData,
    } = useAsyncData(
      async () => {
        return fetchData(_userInfo);
      },
      { lazy: false }
    );
    await getRealTimeData();

    editableUserData.value.userName = "B";
    expect(editableUserData.value.userName).toBe("B");
    expect(userInfo.value.userName).toBe("A");
  });

  test("source can't be edit", async () => {
    const { data: userInfo, getRealTimeData } = useAsyncData(
      async () => { 
        return fetchData(_userInfo);
      },
      { lazy: false }
    );
    await getRealTimeData();
    userInfo.value.userName = "B";
    expect(userInfo.value.userName).toBe("A");
  });

  // test("refresh", async () => {
  //   editableUserData.value.userName = "B";
  //   refresh();
  //   expect(editableUserData.value.userName).toBe("B");
  //   await getRealTimeData();
  //   expect(editableUserData.value.userName).toBe("A");
  // });
});
