/* 组件生命周期函数测试 */

function initComponent() {
  return {
    onLoad: function() {
      console.log("component onload");
    },
    /**
         * 生命周期函数--监听页面初次渲染完成
         */
    onReady: function() {
      console.log("component onReady");
    },
    /**
         * 生命周期函数--监听页面显示
         */
    onShow: function() {
      console.log("component onShow");
    },
    /**
         * 生命周期函数--监听页面隐藏
         */
    onHide: function() {
      console.log("component onHide");
    },
    /**
         * 生命周期函数--监听页面卸载
         */
    onUnload: function() {
      console.log("component onUnload");
    },
    /**
         * 页面相关事件处理函数--监听用户下拉动作
         */
    onPullDownRefreash: function() {
      console.log("component onPullDownRefreash");
    },
    /**
         * 页面上拉触底事件的处理函数
         */
    onReachBottom: function() {
      console.log("component onReachBottom");
    }
  };
}

export { initComponent };
