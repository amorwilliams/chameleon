import sys
#sys.path.append('../buildscript/Resource/chameleon/tools')
sys.path.append('../buildscript/ChameleonTool/')

import xml.dom.minidom as xml
import unittest
from AndroidManifest import AndroidManifestInst

class TestAndroidManifest(unittest.TestCase):
    def setUp(self):
        self.manifestInst = AndroidManifestInst('./AndroidManifest.xml')
        self.libManifestInst = AndroidManifestInst('./LibAndroidManifest.xml')

    def tearDown(self):
        pass

    def testGetPermissions(self):
        permission = self.manifestInst.getPermissions()
        self.assertEqual(len(permission), 1)
        self.assertEqual(permission[0].getAttribute('android:name'), 
                'android.permission.WRITE_EXTERNAL_STORAGE')
        permission = self.libManifestInst.getPermissions()
        self.assertEqual(len(permission), 3)

    def testMergePermission(self):
        self.manifestInst.merge(self.libManifestInst)
        permissions = self.manifestInst.getPermissions()
        self.assertEqual(len(permissions), 3)
        result = ['android.permission.ACCESS_NETWORK_STATE', 
                'android.permission.ACCESS_WIFI_STATE', 
                'android.permission.WRITE_EXTERNAL_STORAGE']
        for permission in permissions:
            self.assertTrue(permission.getAttribute('android:name') in result)
            result.remove(permission.getAttribute('android:name'))

    def testMergeActivity(self):
        self.manifestInst.merge(self.libManifestInst)
        nodes = [n for n in self.manifestInst._applicationNode.childNodes
                if n.nodeType==n.ELEMENT_NODE]
        result = [(u'activity', u"com.example.testwrapper.MainActivity"),
                ('activity', "com.qihoopay.insdk.activity.ContainerActivity"),
                ('service', "com.nd.commplatform.service.NdDownloadService")]
        self.assertEqual(len(nodes), 3)
        for n in nodes:
            tag = n.tagName
            val = n.getAttribute('android:name')
            m = (tag, val)
            self.assertTrue(m in result)
            result.remove(m)

    def testReplace(self):
        toReplace = AndroidManifestInst('./libReplaceManifest.xml')        
        toReplace.replace({"orientation": "landscape", "appId": "replaceAppId", 
            'appKey': 'appKeyaaaa'})
        result = [False, False, False]
        for n in toReplace._applicationNode.childNodes:
            if n.nodeType == n.ELEMENT_NODE and n.tagName == 'activity': 
                if n.getAttribute('android:name') == 'xxxxxx':
                    self.assertEqual(n.getAttribute('android:screenOrientation'), 
                        'landscape')
                    self.assertFalse(n.hasAttribute('chameleon:replace'))
                    result[0] = True
                if n.getAttribute('android:name') == 'OakenshieldActivity':
                    ts = n.getElementsByTagName('data')
                    self.assertEqual(1, len(ts))
                    t = ts[0]
                    self.assertEqual(t.getAttribute('android:scheme'), 
                            'Wandoujia-PaySdk-replaceAppId')
                    result[1] = True
                if n.getAttribute('android:name') == 'MarioAccountActivity':
                    self.assertEqual(n.getAttribute('android:configChanges'),
                        "orientation|keyboardHidden")
                    self.assertEqual(n.getAttribute('android:theme'),
                        "@android:style/Theme.Translucent.NoTitleBar")
                    self.assertEqual(n.getAttribute('android:launchMode'), 
                        "singleTop")
                    result[2] = True

        self.assertEqual(result, [True, True, True])

    def testReplaceEntryActivity(self):
        self.manifestInst.replaceEntryActivity()
        originMainActivity = AndroidManifestInst._getChildNS(
                self.manifestInst._applicationNode, 'activity', [('android:name', 
                    'com.example.testwrapper.MainActivity')])
        intentFilterNode = AndroidManifestInst._getChildNS(originMainActivity,
                'intent-filter')
        if intentFilterNode is not None:
            actionNodes = intentFilterNode.getElementsByTagName('action')
            for n in actionNodes:
                self.assertNotEqual(n.getAttribute('android:name'), 
                        'android.intent.action.MAIN')
            categoryNodes = intentFilterNode.getElementsByTagName('category')
            for n in actionNodes:
                self.assertNotEqual(n.getAttribute('android:name'), 
                        'android.intent.category.LAUNCHER')
        splashActivity = AndroidManifestInst._getChildNS(
                self.manifestInst._applicationNode, 'activity', [('android:name', 
                    'prj.chameleon.channelapi.SplashScreenActivity')])
        intentFilterNode = AndroidManifestInst._getChildNS(splashActivity,
                'intent-filter')
        self.assertIsNotNone(intentFilterNode)
        actionNodes = intentFilterNode.getElementsByTagName('action')
        self.assertEqual(len(actionNodes), 1)
        self.assertEqual(actionNodes[0].getAttribute('android:name'), 
                'android.intent.action.MAIN')
        categoryNodes = intentFilterNode.getElementsByTagName('category')
        self.assertEqual(len(categoryNodes), 1)
        self.assertEqual(categoryNodes[0].getAttribute('android:name'), 
                'android.intent.category.LAUNCHER')
        metaDataNodes = AndroidManifestInst._getChildNS(splashActivity, 
                'meta-data', [('android:name', 'prj.chameleon.intent.main')])
        self.assertIsNotNone(metaDataNodes)
        self.assertEqual(metaDataNodes.getAttribute('android:value'), 
                'com.example.testwrapper.MainActivity')



unittest.main()

