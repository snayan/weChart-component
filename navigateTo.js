/* 管理路由 */

const nativeNavigateTo = wx.navigateTo;

Object.defineProperty(wx, "navigateTo", {
  get() {
    let pages = getCurrentPages();
    return pages.length > 4 ? wx.redirectTo : nativeNavigateTo;
  }
});
