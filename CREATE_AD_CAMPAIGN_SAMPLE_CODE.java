/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 */

import com.facebook.ads.sdk.*;
import java.io.File;
import java.util.Arrays;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class PROMOTE_YOUR_PAGE {
  private static boolean inCleanUp = false;
  public static void run() throws APIException {
      String access_token = "EAAZAGZA1ZBljicBRewiu72TNbK8BamKlh5h2E8bZBn29o6ibZCccQAD1IbpNdMhOiLmLs3YREImAUuDAKPFBBoR1ZBgOEBwFNoVwrj1KlA8P5JfXRw86EZAwSwJPHFdQTLLnTOhdQdtSDmWYZCoIau2Cbh6IPUjf7JcDx8AtDKYR79HMxRbPYeuCb5GtlsFLtqPzgJ2f";
      String app_id = "1766259660525095";
      String ad_account_id = "1698818631571716";
      String campaign_name = "";
      APIContext context = new APIContext(access_token).enableDebug(false);

      // Create an ad campaign with objective OUTCOME_TRAFFIC
      Campaign campaign = new AdAccount(ad_account_id, context).createCampaign()
        .setObjective(Campaign.EnumObjective.VALUE_OUTCOME_TRAFFIC)
        .setStatus(Campaign.EnumStatus.VALUE_PAUSED)
        .setBuyingType("AUCTION")
        .setName(campaign_name)
        .setSpecialAdCategories(Arrays.asList())
        .execute();
      String campaign_id = campaign.getId();
      System.out.println("Created Campaign ID: " + campaign_id);      	
  }

  public static void main (String args[]) throws APIException {
    inCleanUp = false;
    try {
      run();
    } catch (APIException e) {
      if (!inCleanUp) throw e;
    }
  }
}